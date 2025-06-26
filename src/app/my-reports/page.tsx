"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Badge component removed - using custom styling instead
import { MapPin, Calendar, Eye, ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase"

// Define the Report type based on your database schema
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
}

export default function MyReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get user profile from session storage or redirect to login
  useEffect(() => {
    const getUserProfile = () => {
      try {
        const storedProfile = sessionStorage.getItem('userProfile')
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile) as Profile
          setUserProfile(parsedProfile)
          return parsedProfile
        } else {
          // If no profile in session storage, redirect to login or dashboard
          router.push('/') // Adjust this path as needed
          return null
        }
      } catch (error) {
        console.error('Error retrieving profile from session storage:', error)
        setError('Failed to load user profile')
        return null
      }
    }

    const profile = getUserProfile()
    if (profile) {
      fetchUserReports(profile.id)
    }
  }, [router])

  // Fetch reports for the current user
  const fetchUserReports = async (profileId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to load your reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get status styling
  const getStatusInfo = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: Clock,
          iconColor: 'text-yellow-600'
        }
      case 'in_progress':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          icon: AlertTriangle,
          iconColor: 'text-blue-600'
        }
      case 'resolved':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'closed':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: XCircle,
          iconColor: 'text-gray-600'
        }
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: Clock,
          iconColor: 'text-gray-600'
        }
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Handle view report details
  const handleViewReport = (reportId: string) => {
    router.push(`/report-details/${reportId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your reports...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-600 mt-2">
            {userProfile ? `Reports submitted by ${userProfile.name}` : 'Your submitted reports'}
          </p>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {reports.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.status === 'resolved').length}
                </div>
                <div className="text-sm text-gray-600">Resolved</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any reports yet.
              </p>
              <Button onClick={() => router.push('/report-incident')}>
                Report Your First Incident
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const statusInfo = getStatusInfo(report.status)
              const StatusIcon = statusInfo.icon
              
              return (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                            <StatusIcon className={`h-3 w-3 ${statusInfo.iconColor}`} />
                            <span className="capitalize">{report.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(report.created_at)}</span>
                          </div>
                        </div>
                        
                        <CardTitle className="text-lg mb-1">
                          {report.location_string}
                        </CardTitle>
                        
                        {report.address && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{report.address}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report.id)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <CardDescription className="text-base mb-3">
                      {report.description.length > 200 
                        ? `${report.description.substring(0, 200)}...` 
                        : report.description
                      }
                    </CardDescription>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>ID: {report.id.substring(0, 8)}...</span>
                        {report.photo_urls && report.photo_urls.length > 0 && (
                          <span>📷 {report.photo_urls.length} photo{report.photo_urls.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      
                      {report.updated_at !== report.created_at && (
                        <span className="text-sm text-gray-500">
                          Updated: {formatDate(report.updated_at)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={() => router.push('/report-incident')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Report New Incident
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}