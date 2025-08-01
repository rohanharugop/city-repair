"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MapPin, Search, AlertTriangle, Plus, Sun, Moon, User, Calendar, Briefcase, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Profile } from "@/lib/supabase"

interface CitizenDashboardProps {
  profile?: Profile // Keep as optional fallback
}

export function CitizenDashboard({ profile: propProfile }: CitizenDashboardProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'session' | 'props' | 'loading'>('loading')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    gender: '',
    profession: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  
  const supabase = createClientComponentClient()

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  // Fetch profile from session with fallback to props
  useEffect(() => {
    const fetchProfileFromSession = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          // Fall back to prop profile if session error
          if (propProfile) {
            setProfile(propProfile)
            setDataSource('props')
            setEditForm({
              name: propProfile.name,
              age: propProfile.age.toString(),
              gender: propProfile.gender,
              profession: propProfile.profession
            })
            setTimeout(() => setIsLoaded(true), 100)
            setLoading(false)
            return
          }
          throw new Error(`Session error: ${sessionError.message}`)
        }

        if (!session?.user) {
          console.warn('No authenticated session found')
          // Fall back to prop profile if no session
          if (propProfile) {
            setProfile(propProfile)
            setDataSource('props')
            setEditForm({
              name: propProfile.name,
              age: propProfile.age.toString(),
              gender: propProfile.gender,
              profession: propProfile.profession
            })
            setTimeout(() => setIsLoaded(true), 100)
            setLoading(false)
            return
          }
          throw new Error('No authenticated user found')
        }

        // Fetch profile data using the user ID from session
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          // Fall back to prop profile if database error
          if (propProfile) {
            setProfile(propProfile)
            setDataSource('props')
            setEditForm({
              name: propProfile.name,
              age: propProfile.age.toString(),
              gender: propProfile.gender,
              profession: propProfile.profession
            })
            setTimeout(() => setIsLoaded(true), 100)
            setLoading(false)
            return
          }
          throw new Error(`Profile fetch error: ${profileError.message}`)
        }

        if (!profileData) {
          console.warn('No profile data found in database')
          // Fall back to prop profile if no data
          if (propProfile) {
            setProfile(propProfile)
            setDataSource('props')
            setEditForm({
              name: propProfile.name,
              age: propProfile.age.toString(),
              gender: propProfile.gender,
              profession: propProfile.profession
            })
            setTimeout(() => setIsLoaded(true), 100)
            setLoading(false)
            return
          }
          throw new Error('Profile not found')
        }

        setProfile(profileData)
        setDataSource('session')
        
        // Initialize edit form with profile data
        setEditForm({
          name: profileData.name,
          age: profileData.age.toString(),
          gender: profileData.gender,
          profession: profileData.profession
        })
        
        // Trigger animations after data loads
        setTimeout(() => setIsLoaded(true), 100)
        
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfileFromSession()
  }, [supabase, propProfile])

  // Function to handle edit form changes
  const handleEditFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Function to start editing
  const startEditing = () => {
    if (profile) {
      setEditForm({
        name: profile.name,
        age: profile.age.toString(),
        gender: profile.gender,
        profession: profile.profession
      })
      setIsEditing(true)
    }
  }

  // Function to cancel editing
  const cancelEditing = () => {
    setIsEditing(false)
    setError(null)
  }

  // Function to save changes
  const saveChanges = async () => {
    if (!profile) return

    // Validate form
    if (!editForm.name.trim()) {
      setError('Name is required')
      return
    }
    
    const age = parseInt(editForm.age)
    if (isNaN(age) || age < 1 || age > 150) {
      setError('Please enter a valid age between 1 and 150')
      return
    }

    if (!editForm.gender.trim()) {
      setError('Gender is required')
      return
    }

    if (!editForm.profession.trim()) {
      setError('Profession is required')
      return
    }

    try {
      setIsUpdating(true)
      setError(null)

      // Check if we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        // If no session, check if we're working with props data
        if (dataSource === 'props') {
          // Update local state only (no database update possible)
          const updatedProfile = {
            ...profile,
            name: editForm.name.trim(),
            age: age,
            gender: editForm.gender.trim(),
            profession: editForm.profession.trim()
          }
          
          setProfile(updatedProfile)
          setIsEditing(false)
          setError('Profile updated locally. Please sign in to save changes to your account.')
          
          // Clear error after 5 seconds
          setTimeout(() => setError(null), 5000)
          return
        }
        
        throw new Error('No authenticated user. Please sign in to save changes.')
      }

      // We have a session, proceed with database update
      const updatedData = {
        name: editForm.name.trim(),
        age: age,
        gender: editForm.gender.trim(),
        profession: editForm.profession.trim(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Update error: ${error.message}`)
      }

      setProfile(data)
      setDataSource('session')
      setIsEditing(false)
      
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const dashboardButtons = [
    {
      title: "My Reports",
      description: "View all your submitted reports",
      icon: FileText,
      iconColor: "text-blue-600",
      bgColor: isDark ? "bg-blue-500/10" : "bg-blue-100",
      hoverColor: isDark ? "hover:bg-blue-500/20" : "hover:bg-blue-200",
      onClick: () => router.push("/my-reports"),
    },
    {
      title: "My Contributions",
      description: "Track your community contributions",
      icon: Users,
      iconColor: "text-green-600",
      bgColor: isDark ? "bg-green-500/10" : "bg-green-100",
      hoverColor: isDark ? "hover:bg-green-500/20" : "hover:bg-green-200",
      onClick: () => router.push("/my-contributions"),
    },
    {
      title: "Latest Reports",
      description: "Find recent reports around you",
      icon: MapPin,
      iconColor: "text-purple-600",
      bgColor: isDark ? "bg-purple-500/10" : "bg-purple-100",
      hoverColor: isDark ? "hover:bg-purple-500/20" : "hover:bg-purple-200",
      onClick: () => router.push("/latest-reports"),
    },
    {
      title: "Locate a Specific Report",
      description: "Search for specific reports",
      icon: Search,
      iconColor: "text-orange-600",
      bgColor: isDark ? "bg-orange-500/10" : "bg-orange-100",
      hoverColor: isDark ? "hover:bg-orange-500/20" : "hover:bg-orange-200",
      onClick: () => router.push("/locate-specific-report"),
    },
  ]

  const handleReportIncident = () => {
    router.push("/report-incident") 
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen p-6 bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Failed to Load Profile
          </h2>
          <p className="text-gray-400 mb-4">
            {error || 'Profile data not available'}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const profileFields = [
    {
      label: "Name",
      value: profile.name,
      icon: User,
      iconColor: "text-blue-500"
    },
    {
      label: "Age",
      value: profile.age,
      icon: Calendar,
      iconColor: "text-green-500"
    },
    {
      label: "Gender",
      value: profile.gender,
      icon: UserCheck,
      iconColor: "text-purple-500"
    },
    {
      label: "Profession",
      value: profile.profession,
      icon: Briefcase,
      iconColor: "text-orange-500"
    }
  ]

  return (
    <div className="min-h-screen p-6 bg-black transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header with Theme Toggle */}
        <div className={`mb-8 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-100 mb-2">
                Welcome, {profile.name}
              </h1>
              <p className="text-lg text-gray-300">Citizen Dashboard</p>
              <p className="text-sm mt-1 text-blue-400">
                Profile loaded from: {dataSource === 'session' ? 'Database Session' : dataSource === 'props' ? 'Props (Fallback)' : 'Loading...'}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="flex items-center space-x-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-gray-200"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </Button>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className={`mb-8 transform transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20 shadow-xl shadow-purple-900/25 transition-all duration-300">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-gray-100">
                  {isEditing ? 'Edit Profile' : 'Profile Information'}
                </CardTitle>
                <div className="space-x-2">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={cancelEditing}
                        disabled={isUpdating}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={saveChanges}
                        disabled={isUpdating}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={startEditing}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              {error && (
                <div className={`mt-2 p-2 border rounded ${
                  error.includes('locally') 
                    ? 'bg-yellow-900/20 border-yellow-500/20' 
                    : 'bg-red-900/20 border-red-500/20'
                }`}>
                  <p className={`text-sm ${
                    error.includes('locally') 
                      ? 'text-yellow-400' 
                      : 'text-red-400'
                  }`}>{error}</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span>Name</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditFormChange('name', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter your name"
                    />
                  </div>

                  {/* Age Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span>Age</span>
                    </label>
                    <input
                      type="number"
                      value={editForm.age}
                      onChange={(e) => handleEditFormChange('age', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      placeholder="Enter your age"
                      min="1"
                      max="150"
                    />
                  </div>

                  {/* Gender Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-purple-500" />
                      <span>Gender</span>
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => handleEditFormChange('gender', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Profession Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-orange-500" />
                      <span>Profession</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.profession}
                      onChange={(e) => handleEditFormChange('profession', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="Enter your profession"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {profileFields.map((field, index) => (
                    <div key={index} className="p-4 bg-gray-700/50 transition-colors duration-300">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gray-600">
                          <field.icon className={`h-5 w-5 ${field.iconColor}`} />
                        </div>
                        <p className="text-sm font-medium text-gray-400">
                          {field.label}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gray-200">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dashboardButtons.map((button, index) => (
            <div
              key={index}
              className={`transform transition-all duration-700 ${
                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <Card className="cursor-pointer transition-all duration-300 group bg-purple-900/30 backdrop-blur-sm border-purple-500/20 hover:shadow-xl hover:shadow-purple-900/25 hover:border-purple-400/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 transition-all duration-300 group-hover:scale-110 ${button.bgColor} ${button.hoverColor}`}>
                      <button.icon className={`h-7 w-7 ${button.iconColor} transition-colors duration-300`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-100 group-hover:text-blue-600 transition-colors duration-300">
                        {button.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1">
                        {button.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={button.onClick} 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    Open {button.title}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Report Incident Button - Circular */}
        <div className={`flex justify-center transform transition-all duration-700 delay-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <Button
            size="lg"
            className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 flex items-center justify-center p-0"
            onClick={handleReportIncident}
          >
            <Plus className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  )
}