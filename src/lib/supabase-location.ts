// lib/supabase-location.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface LocationReport {
  id: string
  profile_id: string
  location_string: string
  description: string
  latitude: number
  longitude: number
  address: string | null
  photo_urls: string[] | null
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  distance?: number
  profiles?: {
    name: string
  }
}

export interface UserLocation {
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

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

/**
 * Get user's current location using browser geolocation API (fallback)
 * @param options - Geolocation options
 * @returns Promise that resolves to user location
 */
export const getBrowserLocation = (options?: PositionOptions): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
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
      defaultOptions
    )
  })
}

/**
 * Get user's current location using Google Maps APIs
 * @param apiKey - Google Maps API key
 * @param fallbackToBrowser - Whether to fallback to browser geolocation if Google fails
 * @returns Promise that resolves to user location with optional address
 */
export const getCurrentLocationWithGoogleMaps = async (
  apiKey?: string,
  fallbackToBrowser: boolean = true
): Promise<UserLocation> => {
  const googleApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!googleApiKey) {
    if (fallbackToBrowser) {
      console.warn('Google Maps API key not found, falling back to browser geolocation')
      return getBrowserLocation()
    }
    throw new Error('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
  }

  try {
    // First try to get location using browser geolocation for coordinates
    const browserLocation = await getBrowserLocation()
    
    // Then use Google Maps Geocoding API to get a formatted address
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${browserLocation.latitude},${browserLocation.longitude}&key=${googleApiKey}`
    
    const geocodingResponse = await fetch(geocodingUrl)
    
    if (!geocodingResponse.ok) {
      throw new Error(`Google Maps Geocoding API error: ${geocodingResponse.status}`)
    }
    
    const geocodingData: GoogleMapsGeocodingResponse = await geocodingResponse.json()
    
    if (geocodingData.status === 'OK' && geocodingData.results.length > 0) {
      return {
        ...browserLocation,
        address: geocodingData.results[0].formatted_address
      }
    } else {
      // Return browser location without address if geocoding fails
      return browserLocation
    }
  } catch (browserError) {
    // If browser geolocation fails, try Google Maps Geolocation API
    try {
      const geolocationUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleApiKey}`
      
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
      try {
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${geolocationData.location.lat},${geolocationData.location.lng}&key=${googleApiKey}`
        
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
      } catch (geocodingError) {
        // Return location without address if geocoding fails
        return {
          latitude: geolocationData.location.lat,
          longitude: geolocationData.location.lng
        }
      }
    } catch (googleError) {
      if (fallbackToBrowser) {
        console.warn('Google Maps APIs failed, attempting browser geolocation fallback')
        return getBrowserLocation()
      }
      throw new Error(`Failed to get location: ${googleError instanceof Error ? googleError.message : 'Unknown error'}`)
    }
  }
}

/**
 * Get address for given coordinates using Google Maps Geocoding API
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param apiKey - Google Maps API key (optional)
 * @returns Promise that resolves to formatted address or null
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number,
  apiKey?: string
): Promise<string | null> => {
  const googleApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!googleApiKey) {
    console.warn('Google Maps API key not found, cannot get address')
    return null
  }

  try {
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`
    
    const response = await fetch(geocodingUrl)
    
    if (!response.ok) {
      throw new Error(`Google Maps Geocoding API error: ${response.status}`)
    }
    
    const data: GoogleMapsGeocodingResponse = await response.json()
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address
    }
    
    return null
  } catch (error) {
    console.error('Error getting address from coordinates:', error)
    return null
  }
}

/**
 * Fetch reports within a specified radius of a location
 * @param userLocation - User's current location
 * @param radiusKm - Search radius in kilometers (default: 5)
 * @param status - Optional status filter
 * @param limit - Maximum number of reports to return
 * @returns Promise that resolves to array of reports with distance
 */
export const fetchReportsNearLocation = async (
  userLocation: UserLocation,
  radiusKm: number = 5,
  status?: string,
  limit?: number
): Promise<LocationReport[]> => {
  const supabase = createClientComponentClient()

  try {
    // Convert radius from km to degrees (approximate)
    // 1 degree ≈ 111 km at equator
    const radiusInDegrees = radiusKm / 111

    let query = supabase
      .from('reports')
      .select(`
        *,
        profiles (
          name
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', userLocation.latitude - radiusInDegrees)
      .lte('latitude', userLocation.latitude + radiusInDegrees)
      .gte('longitude', userLocation.longitude - radiusInDegrees)
      .lte('longitude', userLocation.longitude + radiusInDegrees)
      .order('created_at', { ascending: false })

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Add limit if provided
    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`)
    }

    // Filter by exact distance and add distance to each report
    const reportsWithDistance = (data || [])
      .map(report => ({
        ...report,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          Number(report.latitude),
          Number(report.longitude)
        )
      }))
      .filter(report => report.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)

    return reportsWithDistance
  } catch (error) {
    console.error('Error fetching nearby reports:', error)
    throw error
  }
}

/**
 * Fetch reports within a bounding box (more efficient for larger areas)
 * @param userLocation - User's current location
 * @param radiusKm - Search radius in kilometers
 * @param status - Optional status filter
 * @returns Promise that resolves to array of reports
 */
export const fetchReportsInBoundingBox = async (
  userLocation: UserLocation,
  radiusKm: number,
  status?: string
): Promise<LocationReport[]> => {
  const supabase = createClientComponentClient()

  try {
    const radiusInDegrees = radiusKm / 111

    const bounds = {
      north: userLocation.latitude + radiusInDegrees,
      south: userLocation.latitude - radiusInDegrees,
      east: userLocation.longitude + radiusInDegrees,
      west: userLocation.longitude - radiusInDegrees
    }

    let query = supabase
      .from('reports')
      .select(`
        *,
        profiles (
          name
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error fetching reports in bounding box:', error)
    throw error
  }
}

/**
 * Get reports statistics for a location
 * @param userLocation - User's current location
 * @param radiusKm - Search radius in kilometers
 * @returns Promise that resolves to statistics object
 */
export const getLocationReportsStats = async (
  userLocation: UserLocation,
  radiusKm: number = 5
): Promise<{
  total: number
  pending: number
  inProgress: number
  resolved: number
  closed: number
}> => {
  try {
    const reports = await fetchReportsNearLocation(userLocation, radiusKm)
    
    const stats = {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      inProgress: reports.filter(r => r.status === 'in_progress').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      closed: reports.filter(r => r.status === 'closed').length
    }

    return stats
  } catch (error) {
    console.error('Error getting location reports stats:', error)
    throw error
  }
}

/**
 * Format distance for display
 * @param distance - Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  }
  return `${distance.toFixed(1)}km`
}

/**
 * Check if user location is within a certain distance of a point
 * @param userLocation - User's current location
 * @param targetLocation - Target location to check
 * @param maxDistanceKm - Maximum distance in kilometers
 * @returns Boolean indicating if within range
 */
export const isWithinRange = (
  userLocation: UserLocation,
  targetLocation: UserLocation,
  maxDistanceKm: number
): boolean => {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  )
  return distance <= maxDistanceKm
}

/**
 * Get the nearest report to user location
 * @param userLocation - User's current location
 * @param radiusKm - Search radius in kilometers
 * @returns Promise that resolves to nearest report or null
 */
export const getNearestReport = async (
  userLocation: UserLocation,
  radiusKm: number = 10
): Promise<LocationReport | null> => {
  try {
    const reports = await fetchReportsNearLocation(userLocation, radiusKm, undefined, 1)
    return reports.length > 0 ? reports[0] : null
  } catch (error) {
    console.error('Error getting nearest report:', error)
    throw error
  }
}

/**
 * Enhanced location search with multiple fallback strategies
 * @param options Configuration options
 * @returns Promise that resolves to user location
 */
export const getCurrentLocationEnhanced = async (options?: {
  apiKey?: string
  timeout?: number
  enableHighAccuracy?: boolean
  fallbackToBrowser?: boolean
  includeAddress?: boolean
}): Promise<UserLocation> => {
  const {
    apiKey,
    timeout = 10000,
    enableHighAccuracy = true,
    fallbackToBrowser = true,
    includeAddress = true
  } = options || {}

  if (includeAddress) {
    return getCurrentLocationWithGoogleMaps(apiKey, fallbackToBrowser)
  } else {
    return getBrowserLocation({
      enableHighAccuracy,
      timeout,
      maximumAge: 60000
    })
  }
}