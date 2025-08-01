"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MapPin, Clock, User, Camera, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Report {
  id: string
  profile_id: string
  location_string: string
  description: string
  latitude: number | null
  longitude: number | null
  address: string | null
  photo_urls: string[] | null
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  profiles: {
    name: string
  }
}

export default function LatestReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    fetchLatestReports()
    // Trigger animations after component mounts
    setTimeout(() => setIsLoaded(true), 100)
  }, [])

  const fetchLatestReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        throw error
      }

      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to fetch latest reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10'
      case 'in_progress':
        return 'text-blue-500 bg-blue-500/10'
      case 'resolved':
        return 'text-green-500 bg-green-500/10'
      case 'closed':
        return 'text-gray-500 bg-gray-500/10'
      default:
        return 'text-gray-500 bg-gray-500/10'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading latest reports...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-black transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`mb-8 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-gray-100 mb-2">
              Latest Reports
            </h1>
            <p className="text-lg text-gray-300">
              Most recent reports from the community
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className={`mb-8 transform transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <Card className="bg-red-900/30 border-red-500/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
                <Button 
                  onClick={fetchLatestReports} 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports List */}
        {!error && (
          <div className="space-y-6">
            {reports.length === 0 ? (
              <div className={`transform transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
                  <CardContent className="p-12 text-center">
                    <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">
                      No Reports Found
                    </h3>
                    <p className="text-gray-400">
                      There are no reports available at the moment. Be the first to report an incident!
                    </p>
                    <Button 
                      onClick={() => router.push('/report-incident')}
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                    >
                      Report an Incident
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              reports.map((report, index) => (
                <div
                  key={report.id}
                  className={`transform transition-all duration-700 ${
                    isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: `${200 + index * 150}ms` }}
                >
                  <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20 hover:shadow-xl hover:shadow-purple-900/25 hover:border-purple-400/30 transition-all duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="flex items-center space-x-1 text-gray-400 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(report.created_at)}</span>
                            </div>
                          </div>
                          <CardTitle className="text-xl text-gray-100 mb-1">
                            Report #{report.id.slice(0, 8)}
                          </CardTitle>
                          <div className="flex items-center space-x-2 text-gray-400 text-sm">
                            <User className="h-4 w-4" />
                            <span>Reported by {report.profiles?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Location */}
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-200 font-medium">Location</p>
                          <p className="text-gray-400 text-sm">
                            {report.address || report.location_string}
                          </p>
                          {report.latitude && report.longitude && (
                            <p className="text-gray-500 text-xs mt-1">
                              Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-gray-200 font-medium mb-2">Description</p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {truncateText(report.description, 200)}
                        </p>
                      </div>

                      {/* Photos */}
                      {report.photo_urls && report.photo_urls.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Camera className="h-4 w-4 text-purple-400" />
                            <p className="text-gray-200 font-medium text-sm">
                              {report.photo_urls.length} Photo{report.photo_urls.length > 1 ? 's' : ''} Attached
                            </p>
                          </div>
                          <div className="flex space-x-2 overflow-x-auto">
                            {report.photo_urls.slice(0, 3).map((url, photoIndex) => (
                              <div key={photoIndex} className="flex-shrink-0">
                                <img
                                  src={url}
                                  alt={`Report photo ${photoIndex + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-purple-500/20"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                            {report.photo_urls.length > 3 && (
                              <div className="w-16 h-16 bg-gray-700/50 rounded-lg border border-purple-500/20 flex items-center justify-center">
                                <span className="text-xs text-gray-400">
                                  +{report.photo_urls.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* View Details Button */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/50"
                          onClick={() => router.push(`/report/${report.id}`)}
                        >
                          View Full Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        )}

        {/* Refresh Button */}
        {!loading && (
          <div className={`mt-8 flex justify-center transform transition-all duration-700 delay-500 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <Button
              onClick={fetchLatestReports}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
            >
              Refresh Reports
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}