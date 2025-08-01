"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Loader2, AlertTriangle, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Report {
  id: string
  location_string: string
  description: string
  latitude: number
  longitude: number
  address: string | null
  photo_urls: string[] | null
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  profile_id: string
  distance?: number // Distance in km
  profiles?: {
    name: string
  }
}

interface UserLocation {
  latitude: number
  longitude: number
  address?: string
}

interface GoogleMapsGeolocationResponse {
  location: {
    lat: number
    lng: number
  }
  accuracy: number
}

interface GoogleMapsGeocodingResponse {
  results: Array<{
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
  }>
  status: string
}

export default function ReportsAroundMe() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(5) // Default 5km radius

  const statusConfig = {
    pending: { 
      icon: Clock, 
      color: "bg-yellow-500", 
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      label: "Pending" 
    },
    in_progress: { 
      icon: Loader2, 
      color: "bg-blue-500", 
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      label: "In Progress" 
    },
    resolved: { 
      icon: CheckCircle, 
      color: "bg-green-500", 
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      label: "Resolved" 
    },
    closed: { 
      icon: XCircle, 
      color: "bg-gray-500", 
      textColor: "text-gray-700",
      bgColor: "bg-gray-50",
      label: "Closed" 
    }
  }

  // Get user's current location using Google Maps Geolocation API
  const getCurrentLocationWithGoogleMaps = async (): Promise<UserLocation> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      throw new Error('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
    }

    try {
      // First try to get location using browser geolocation for coordinates
      const browserLocation = await getBrowserLocation()
      
      // Then use Google Maps Geocoding API to get a formatted address
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${browserLocation.latitude},${browserLocation.longitude}&key=${apiKey}`
      
      const geocodingResponse = await fetch(geocodingUrl)
      const geocodingData: GoogleMapsGeocodingResponse = await geocodingResponse.json()
      
      if (geocodingData.status === 'OK' && geocodingData.results.length > 0) {
        return {
          latitude: browserLocation.latitude,
          longitude: browserLocation.longitude,
          address: geocodingData.results[0].formatted_address
        }
      } else {
        // Fallback to browser location without address
        return browserLocation
      }
    } catch (browserError) {
      // If browser geolocation fails, try Google Maps Geolocation API
      try {
        const geolocationUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`
        
        const geolocationResponse = await fetch(geolocationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            considerIp: true,
            wifiAccessPoints: [],
            cellTowers: []
          })
        })
        
        if (!geolocationResponse.ok) {
          throw new Error(`Google Maps Geolocation API error: ${geolocationResponse.status}`)
        }
        
        const geolocationData: GoogleMapsGeolocationResponse = await geolocationResponse.json()
        
        // Get address for the location
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${geolocationData.location.lat},${geolocationData.location.lng}&key=${apiKey}`
        
        const geocodingResponse = await fetch(geocodingUrl)
        const geocodingData: GoogleMapsGeocodingResponse = await geocodingResponse.json()
        
        const address = geocodingData.status === 'OK' && geocodingData.results.length > 0 
          ? geocodingData.results[0].formatted_address 
          : undefined
        
        return {
          latitude: geolocationData.location.lat,
          longitude: geolocationData.location.lng,
          address
        }
      } catch (googleError) {
        throw new Error(`Failed to get location: ${googleError instanceof Error ? googleError.message : 'Unknown error'}`)
      }
    }
  }

  // Fallback browser geolocation
  const getBrowserLocation = (): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location.'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.'
              break
          }
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    })
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Fetch nearby reports from Supabase
  const fetchNearbyReports = async (location: UserLocation) => {
    try {
      setLoading(true)
      setError(null)

      // Convert radius from km to degrees (approximate)
      // 1 degree ≈ 111 km at equator
      const radiusInDegrees = radius / 111

      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (
            name
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('latitude', location.latitude - radiusInDegrees)
        .lte('latitude', location.latitude + radiusInDegrees)
        .gte('longitude', location.longitude - radiusInDegrees)
        .lte('longitude', location.longitude + radiusInDegrees)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // Filter by exact distance and add distance to each report
      const reportsWithDistance = (data || [])
        .map(report => ({
          ...report,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            Number(report.latitude),
            Number(report.longitude)
          )
        }))
        .filter(report => report.distance <= radius)
        .sort((a, b) => a.distance - b.distance)

      setReports(reportsWithDistance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  // Initialize location and fetch reports
  const initializeLocation = async () => {
    try {
      setLocationLoading(true)
      setError(null)
      
      const location = await getCurrentLocationWithGoogleMaps()
      setUserLocation(location)
      await fetchNearbyReports(location)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location')
      setLoading(false)
    } finally {
      setLocationLoading(false)
    }
  }

  // Refresh reports
  const refreshReports = async () => {
    if (userLocation) {
      await fetchNearbyReports(userLocation)
    }
  }

  // Change radius and refetch
  const changeRadius = async (newRadius: number) => {
    setRadius(newRadius)
    if (userLocation) {
      await fetchNearbyReports(userLocation)
    }
  }

  useEffect(() => {
    initializeLocation()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshReports}
              disabled={loading || locationLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Reports Around Me
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Incident reports near your location
          </p>

          {/* Location Status */}
          {locationLoading && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Navigation className="h-5 w-5 animate-pulse" />
              <span>Getting your location using Google Maps...</span>
            </div>
          )}

          {userLocation && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <MapPin className="h-5 w-5" />
                <span>
                  Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </span>
              </div>
              {userLocation.address && (
                <p className="text-sm text-gray-600 ml-7">
                  {userLocation.address}
                </p>
              )}
            </div>
          )}

          {/* Radius Selector */}
          {userLocation && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Search radius:</span>
              <div className="flex gap-2">
                {[2, 5, 10, 15].map((radiusOption) => (
                  <Button
                    key={radiusOption}
                    variant={radius === radiusOption ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeRadius(radiusOption)}
                    disabled={loading}
                  >
                    {radiusOption}km
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-900">Error</h3>
                  <p className="text-red-700">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={initializeLocation}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading nearby reports...</p>
            </div>
          </div>
        )}

        {/* Reports List */}
        {!loading && !error && userLocation && (
          <div className="space-y-6">
            {/* Reports Count */}
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Found {reports.length} report{reports.length !== 1 ? 's' : ''} within {radius}km
              </p>
            </div>

            {/* Reports Grid */}
            {reports.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No reports found nearby
                  </h3>
                  <p className="text-gray-600 mb-4">
                    There are no incident reports within {radius}km of your location.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => changeRadius(radius + 5)}
                  >
                    Expand search to {radius + 5}km
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => {
                  const statusInfo = statusConfig[report.status]
                  const StatusIcon = statusInfo.icon

                  return (
                    <Card key={report.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2 mb-2">
                              {report.location_string}
                            </CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant="secondary" 
                                className={`${statusInfo.bgColor} ${statusInfo.textColor}`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatDistance(report.distance!)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {report.profiles && (
                          <p className="text-sm text-gray-600">
                            Reported by: {report.profiles.name}
                          </p>
                        )}
                      </CardHeader>
                      
                      <CardContent>
                        <CardDescription className="mb-4 line-clamp-3">
                          {report.description}
                        </CardDescription>
                        
                        {report.address && (
                          <div className="flex items-start gap-2 mb-3">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {report.address}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{formatDate(report.created_at)}</span>
                          {report.photo_urls && report.photo_urls.length > 0 && (
                            <span>{report.photo_urls.length} photo{report.photo_urls.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}