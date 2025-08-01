"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MapPin, Calendar, Camera, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createBrowserClient } from '@supabase/ssr'

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

interface Profile {
  id: string;
  name: string;
  role: string;
  age?: number;
  gender?: string;
  profession?: string;
}

export default function MyReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionProfile, setSessionProfile] = useState<Profile | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get profile from session storage and validate session
  useEffect(() => {
    const loadProfileAndValidateSession = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get profile from sessionStorage
        const storedProfile = sessionStorage.getItem('userProfile')
        if (!storedProfile) {
          console.log('No profile found in sessionStorage')
          setError('No user profile found. Please return to dashboard.')
          setLoading(false)
          return
        }

        const parsedProfile = JSON.parse(storedProfile) as Profile
        console.log('Profile loaded from sessionStorage:', parsedProfile)
        setSessionProfile(parsedProfile)

        // Validate that we still have a valid Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session validation error:', sessionError);
          setError('Session expired. Please log in again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        if (!session?.user) {
          console.log('No valid session found');
          setError('Session expired. Please log in again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        console.log('Session validated for user:', session.user.id);
        console.log('Profile ID from storage:', parsedProfile.id);

        // Verify the session user matches the stored profile
        if (session.user.id !== parsedProfile.id) {
          console.warn('Session user ID does not match stored profile ID');
          setError('Profile mismatch. Please log in again.');
          sessionStorage.removeItem('userProfile');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Fetch reports for this user
        await fetchReports(parsedProfile.id);

      } catch (error) {
        console.error('Error loading profile from session storage:', error)
        setError('Error loading user profile. Please return to dashboard.')
        setLoading(false)
      }
    };

    loadProfileAndValidateSession();
  }, [])

  // Fetch user reports
  const fetchReports = async (profileId: string) => {
    try {
      console.log('Fetching reports for profile ID:', profileId);

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error);
        throw error
      }

      console.log('Reports fetched:', data?.length || 0, 'reports');
      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Report['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Loader2 },
      resolved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      closed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewOnMap = (latitude: number, longitude: number) => {
    // Open in Google Maps
    window.open(`https://maps.google.com/?q=${latitude},${longitude}`, '_blank')
  }

  const handleRetry = () => {
    window.location.reload();
  };

  const handleBackToDashboard = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading your reports...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Card className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reports</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-x-2">
                  <Button onClick={handleRetry}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleBackToDashboard}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </Card>
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
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-600 mt-2">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'} submitted
          </p>
          {sessionProfile && (
            <p className="text-sm text-blue-600 mt-1">
              Showing reports for: {sessionProfile.name} {sessionProfile.role && `(${sessionProfile.role})`}
            </p>
          )}
        </div>

        {/* Debug Info - Remove this in production */}
        {process.env.NODE_ENV === 'development' && sessionProfile && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-yellow-700">
              <p>Profile ID: {sessionProfile.id}</p>
              <p>Profile Name: {sessionProfile.name}</p>
              <p>Reports Count: {reports.length}</p>
            </CardContent>
          </Card>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any reports yet. Start by reporting an incident in your community.
              </p>
              <Button onClick={() => router.push("/report-incident")}>
                Report New Incident
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">Report #{report.id.slice(0, 8)}</CardTitle>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(report.created_at)}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {report.location_string}
                        </div>
                        {report.photo_urls && report.photo_urls.length > 0 && (
                          <div className="flex items-center">
                            <Camera className="h-4 w-4 mr-1" />
                            {report.photo_urls.length} photo{report.photo_urls.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Description */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-700">{report.description}</p>
                    </div>

                    {/* Address */}
                    {report.address && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                        <p className="text-gray-700">{report.address}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {report.photo_urls && report.photo_urls.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Photos</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {report.photo_urls.map((url, index) => (
                            <div key={index} className="relative">
                              <img
                                src={url}
                                alt={`Report photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all cursor-pointer rounded-lg" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-4 border-t">
                      {report.latitude && report.longitude && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOnMap(report.latitude!, report.longitude!)}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          View on Map
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(report.id)
                        }}
                      >
                        Copy Report ID
                      </Button>
                    </div>

                    {/* Timeline */}
                    {report.updated_at !== report.created_at && (
                      <div className="text-sm text-gray-500 pt-2 border-t">
                        Last updated: {formatDate(report.updated_at)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg"
            onClick={() => router.push("/report-incident")}
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            New Report
          </Button>
        </div>
      </div>
    </div>
  )
}