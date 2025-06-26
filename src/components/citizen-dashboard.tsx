"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MapPin, Search, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { Profile } from "@/lib/supabase"

interface CitizenDashboardProps {
  profile: Profile
}

export function CitizenDashboard({ profile }: CitizenDashboardProps) {
  const router = useRouter()
  const [sessionProfile, setSessionProfile] = useState<Profile | null>(null)

  // Save profile to session storage when component mounts or profile changes
  useEffect(() => {
    if (profile) {
      try {
        sessionStorage.setItem('userProfile', JSON.stringify(profile))
        setSessionProfile(profile)
      } catch (error) {
        console.error('Error saving profile to session storage:', error)
        setSessionProfile(profile) // Fallback to prop
      }
    }
  }, [profile])

  // Retrieve profile from session storage on component mount
  useEffect(() => {
    try {
      const storedProfile = sessionStorage.getItem('userProfile')
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile) as Profile
        setSessionProfile(parsedProfile)
      } else {
        setSessionProfile(profile)
      }
    } catch (error) {
      console.error('Error retrieving profile from session storage:', error)
      setSessionProfile(profile) // Fallback to prop
    }
  }, [])

  // Function to update profile in session storage
  const updateSessionProfile = (updatedProfile: Profile) => {
    try {
      sessionStorage.setItem('userProfile', JSON.stringify(updatedProfile))
      setSessionProfile(updatedProfile)
    } catch (error) {
      console.error('Error updating profile in session storage:', error)
    }
  }

  // Function to clear profile from session storage
  const clearSessionProfile = () => {
    try {
      sessionStorage.removeItem('userProfile')
      setSessionProfile(null)
    } catch (error) {
      console.error('Error clearing profile from session storage:', error)
    }
  }

  // Use session profile if available, otherwise fallback to prop
  const displayProfile = sessionProfile || profile

  const dashboardButtons = [
    {
      title: "My Reports",
      description: "View all your submitted reports",
      icon: FileText,
      onClick: () => router.push("/my-reports"),
    },
    {
      title: "My Contributions",
      description: "Track your community contributions",
      icon: Users,
      onClick: () => console.log("My Contributions clicked"),
    },
    {
      title: "Reports Around Me",
      description: "See nearby incident reports",
      icon: MapPin,
      onClick: () => console.log("Reports Around Me clicked"),
    },
    {
      title: "Locate a Specific Report",
      description: "Search for specific reports",
      icon: Search,
      onClick: () => console.log("Locate Report clicked"),
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {displayProfile.name}</h1>
          <p className="text-gray-600 mt-2">Citizen Dashboard</p>
          <p className="text-sm text-blue-600 mt-1">
            Profile loaded from: {sessionProfile ? 'Session Storage' : 'Props'}
          </p>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Profile Information</CardTitle>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={handleUpdateProfile}>
                    Update Profile
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSessionProfile}>
                    Clear Session
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg">{displayProfile.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Age</p>
                  <p className="text-lg">{displayProfile.age}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="text-lg">{displayProfile.gender}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Profession</p>
                  <p className="text-lg">{displayProfile.profession}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dashboardButtons.map((button, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <button.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{button.title}</CardTitle>
                    <CardDescription>{button.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={button.onClick} className="w-full">
                  Open {button.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg"
            onClick={handleReportIncident}
          >
            <AlertTriangle className="mr-2 h-5 w-5" />
            Report New Incident
          </Button>
        </div>
      </div>
    </div>
  )
}