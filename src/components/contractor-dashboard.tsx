"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Star, MessageSquare, DollarSign, Search } from "lucide-react"
import type { Profile } from "@/lib/supabase"

interface ContractorDashboardProps {
  profile: Profile
}

export function ContractorDashboard({ profile }: ContractorDashboardProps) {
  // Mock data for contractor stats
  const contractorStats = {
    totalJobs: 24,
    averageRating: 4.8,
    latestReview: "Excellent work on the road repair project. Very professional and timely.",
    totalIncome: 15750,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile.name}</h1>
          <p className="text-gray-600 mt-2">Contractor Dashboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Contractor Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contractor Profile</CardTitle>
              <CardDescription>Your professional information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Name:</span>
                  <span className="text-gray-900">{profile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Age:</span>
                  <span className="text-gray-900">{profile.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Gender:</span>
                  <span className="text-gray-900">{profile.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Profession:</span>
                  <span className="text-gray-900">{profile.profession}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Role:</span>
                  <span className="text-blue-600 font-semibold">{profile.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{contractorStats.totalJobs}</p>
                    <p className="text-sm text-gray-500">My Total Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{contractorStats.averageRating}/5</p>
                    <p className="text-sm text-gray-500">My Average Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Latest Review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>My Latest Review</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="text-gray-700 italic">"{contractorStats.latestReview}"</blockquote>
              <div className="flex items-center mt-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(contractorStats.averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-500">5.0</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Income */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>My Total Income Gained</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">${contractorStats.totalIncome.toLocaleString()}</p>
                <p className="text-gray-500 mt-2">Total earnings from completed jobs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
            onClick={() => console.log("Find New Jobs clicked")}
          >
            <Search className="mr-2 h-5 w-5" />
            Find New Jobs
          </Button>
        </div>
      </div>
    </div>
  )
}
