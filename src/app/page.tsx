"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile } from "@/lib/supabase"
import { Questionnaire } from "@/components/questionnaire"
import { CitizenDashboard } from "@/components/citizen-dashboard"
import { ContractorDashboard } from "@/components/contractor-dashboard"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
        setRedirecting(true)
        router.push("/login")
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        setRedirecting(false)
      } else {
        setProfile(null)
        setLoading(false)
        setRedirecting(true)
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      setProfile(data)
    } catch (error: any) {
      console.error("Error fetching profile:", error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Sign out error:", error.message)
      }
    } catch (error: any) {
      console.error("Failed to sign out:", error.message)
    }
  }

  const handleProfileComplete = () => {
    if (user) {
      fetchProfile(user.id)
    }
  }

  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {redirecting ? "Redirecting..." : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // This should rarely happen now due to redirect logic above
  }

  if (!profile) {
    return <Questionnaire userId={user.id} onComplete={handleProfileComplete} />
  }

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {profile.role === "Citizen" ? (
        <CitizenDashboard profile={profile} />
      ) : (
        <ContractorDashboard profile={profile} />
      )}
    </div>
  )
}