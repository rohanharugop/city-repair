"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MapPin, Search, AlertTriangle, Plus, Sun, Moon, User, Calendar, Briefcase, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { Profile } from "@/lib/supabase"

interface CitizenDashboardProps {
  profile: Profile
}

export function CitizenDashboard({ profile }: CitizenDashboardProps) {
  const router = useRouter()
  const [sessionProfile, setSessionProfile] = useState<Profile | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  // Save profile to localStorage when component mounts or profile changes
  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem('userProfile', JSON.stringify(profile))
        setSessionProfile(profile)
      } catch (error) {
        console.error('Error saving profile to localStorage:', error)
        setSessionProfile(profile) // Fallback to prop
      }
    }
  }, [profile])

  // Retrieve profile from localStorage on component mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('userProfile')
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile) as Profile
        setSessionProfile(parsedProfile)
      } else {
        setSessionProfile(profile)
      }
    } catch (error) {
      console.error('Error retrieving profile from localStorage:', error)
      setSessionProfile(profile) // Fallback to prop
    }
    
    // Trigger animations after component mounts
    setTimeout(() => setIsLoaded(true), 100)
  }, [])

  // Function to update profile in localStorage
  const updateSessionProfile = (updatedProfile: Profile) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
      setSessionProfile(updatedProfile)
    } catch (error) {
      console.error('Error updating profile in localStorage:', error)
    }
  }

  // Function to clear profile from localStorage
  const clearSessionProfile = () => {
    try {
      localStorage.removeItem('userProfile')
      setSessionProfile(null)
    } catch (error) {
      console.error('Error clearing profile from localStorage:', error)
    }
  }

  // Use session profile if available, otherwise fallback to prop
  const displayProfile = sessionProfile || profile

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
      title: "Reports Around Me",
      description: "See nearby incident reports",
      icon: MapPin,
      iconColor: "text-purple-600",
      bgColor: isDark ? "bg-purple-500/10" : "bg-purple-100",
      hoverColor: isDark ? "hover:bg-purple-500/20" : "hover:bg-purple-200",
      onClick: () => router.push("/reports-around-me"),
    },
    {
      title: "Locate a Specific Report",
      description: "Search for specific reports",
      icon: Search,
      iconColor: "text-orange-600",
      bgColor: isDark ? "bg-orange-500/10" : "bg-orange-100",
      hoverColor: isDark ? "hover:bg-orange-500/20" : "hover:bg-orange-200",
      onClick: () => router.push("/locate-report"),
    },
  ]

  const handleReportIncident = () => {
    router.push("/report-incident") 
  }

  // Example function to simulate profile update
  const handleUpdateProfile = () => {
    const updatedProfile = {
      ...displayProfile,
      name: displayProfile.name + " (Updated)"
    }
    updateSessionProfile(updatedProfile)
  }

  const profileFields = [
    {
      label: "Name",
      value: displayProfile.name,
      icon: User,
      iconColor: "text-blue-500"
    },
    {
      label: "Age",
      value: displayProfile.age,
      icon: Calendar,
      iconColor: "text-green-500"
    },
    {
      label: "Gender",
      value: displayProfile.gender,
      icon: UserCheck,
      iconColor: "text-purple-500"
    },
    {
      label: "Profession",
      value: displayProfile.profession,
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
                Welcome, {displayProfile.name}
              </h1>
              <p className="text-lg text-gray-300">Citizen Dashboard</p>
              <p className="text-sm mt-1 text-blue-400">
                Profile loaded from: {sessionProfile ? 'Local Storage' : 'Props'}
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
                  Profile Information
                </CardTitle>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUpdateProfile}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Update Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSessionProfile}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Clear Session
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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