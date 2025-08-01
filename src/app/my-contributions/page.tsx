"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, DollarSign, Calendar, MapPin, CheckCircle, Clock, AlertCircle, FileText, CreditCard, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from '@/lib/supabase' // Use the same supabase instance as the report page

interface Transaction {
  id: string
  transaction_id: string
  report_id: string
  amount: number
  name: string
  account: string
  transaction_verified: boolean
  transaction_time: string
  created_at: string
  report?: {
    id: string
    location_string: string | null
    description: string
    status: string
    created_at: string
    profile_id: string
  }
}

interface ContributionStats {
  totalContributions: number
  totalAmount: number
  verifiedContributions: number
  pendingContributions: number
}

interface UserProfile {
  id: string
  name: string
  role: string
}

export default function MyContributions() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<ContributionStats>({
    totalContributions: 0,
    totalAmount: 0,
    verifiedContributions: 0,
    pendingContributions: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadUserAndContributions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Authentication error. Please log in again.')
          return
        }

        if (!session?.user) {
          console.log('No user session found')
          setError('No user session found. Please log in.')
          return
        }

        // Load user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          setError('Error loading user profile. Please ensure your profile is set up correctly.')
          return
        }

        if (!profileData) {
          setError('No profile found. Please complete your profile setup.')
          return
        }

        console.log('Profile loaded:', profileData)
        setProfile(profileData)

        // Fetch contributions for this user
        await fetchContributions(profileData.id)

      } catch (error) {
        console.error('Unexpected error:', error)
        setError('An unexpected error occurred loading your profile.')
      } finally {
        setLoading(false)
        // Trigger animations after loading
        setTimeout(() => setIsLoaded(true), 100)
      }
    }

    loadUserAndContributions()
  }, [])

  const fetchContributions = async (profileId: string) => {
    try {
      console.log('Fetching contributions for profile:', profileId)

      // Method 1: Direct approach - get all transactions for reports by this user
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          report:reports!inner (
            id,
            location_string,
            description,
            status,
            created_at,
            profile_id
          )
        `)
        .eq('report.profile_id', profileId)
        .order('transaction_time', { ascending: false })

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError)
        throw transactionsError
      }

      console.log('Transactions data:', transactionsData)

      // If Method 1 doesn't work, try Method 2: Two-step approach
      if (!transactionsData || transactionsData.length === 0) {
        console.log('No transactions found with Method 1, trying Method 2...')
        
        // First, get all reports by this user
        const { data: userReports, error: reportsError } = await supabase
          .from('reports')
          .select('id')
          .eq('profile_id', profileId)

        if (reportsError) {
          console.error('Error fetching reports:', reportsError)
          throw reportsError
        }

        console.log('User reports:', userReports)

        const reportIds = userReports?.map(report => report.id) || []

        if (reportIds.length === 0) {
          console.log('No reports found for user')
          setTransactions([])
          return
        }

        // Now get all transactions for these reports
        const { data: transactionsData2, error: transactionsError2 } = await supabase
          .from('transactions')
          .select(`
            *,
            report:reports (
              id,
              location_string,
              description,
              status,
              created_at,
              profile_id
            )
          `)
          .in('report_id', reportIds)
          .order('transaction_time', { ascending: false })

        if (transactionsError2) {
          console.error('Error fetching transactions (Method 2):', transactionsError2)
          throw transactionsError2
        }

        console.log('Transactions data (Method 2):', transactionsData2)
        setTransactions(transactionsData2 || [])
        calculateStats(transactionsData2 || [])
        return
      }

      setTransactions(transactionsData || [])
      calculateStats(transactionsData || [])

    } catch (err) {
      console.error('Error in fetchContributions:', err)
      setError('Failed to load contributions. Please try again.')
    }
  }

  const calculateStats = (transactionsData: Transaction[]) => {
    const totalContributions = transactionsData.length
    const totalAmount = transactionsData.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const verifiedContributions = transactionsData.filter(t => t.transaction_verified).length
    const pendingContributions = totalContributions - verifiedContributions

    setStats({
      totalContributions,
      totalAmount,
      verifiedContributions,
      pendingContributions
    })

    console.log('Stats calculated:', {
      totalContributions,
      totalAmount,
      verifiedContributions,
      pendingContributions
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'closed':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500/20 text-green-400'
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'closed':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-blue-500/20 text-blue-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your contributions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-x-2">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Retry
            </Button>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`mb-8 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-gray-100">My Contributions</h1>
                <p className="text-lg text-gray-300 mt-1">Track your community financial contributions</p>
                {profile && (
                  <p className="text-sm text-gray-400 mt-1">
                    Welcome, <span className="font-semibold text-gray-300">{profile.name}</span> ({profile.role})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transform transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Contributions</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.totalContributions}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-100">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CreditCard className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Verified</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.verifiedContributions}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.pendingContributions}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contributions List */}
        <div className={`transform transition-all duration-700 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {transactions.length === 0 ? (
            <Card className="bg-purple-900/30 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-12 text-center">
                <DollarSign className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Contributions Yet</h3>
                <p className="text-gray-400 mb-6">You haven't received any financial contributions for your reports yet.</p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                Recent Contributions ({transactions.length})
              </h2>
              
              {transactions.map((transaction, index) => (
                <Card
                  key={transaction.id}
                  className={`bg-purple-900/30 backdrop-blur-sm border-purple-500/20 hover:shadow-xl hover:shadow-purple-900/25 transition-all duration-300 transform ${
                    isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: `${500 + index * 100}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-green-500/20 rounded-full">
                          <DollarSign className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
                            {formatCurrency(Number(transaction.amount))}
                            {transaction.transaction_verified ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="text-gray-400 mt-1">
                            Transaction ID: {transaction.transaction_id}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">
                          {formatDate(transaction.transaction_time)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {transaction.report && (
                      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-gray-300">Related Report</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transaction.report.status)}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.report.status)}`}>
                              {transaction.report.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-300">
                              {transaction.report.location_string || 'Location not specified'}
                            </p>
                          </div>
                          <p className="text-sm text-gray-400 ml-6">{transaction.report.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-400">Contributor:</span>
                        <span className="text-gray-300">{transaction.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-400">Account:</span>
                        <span className="text-gray-300">{transaction.account}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}