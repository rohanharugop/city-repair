"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, User, FileText, ArrowLeft, AlertCircle, ExternalLink } from "lucide-react";

interface Report {
  id: string;
  profile_id: string;
  location_string: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_urls: string[] | null;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    role: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
}

export default function LocateSpecificReportPage() {
  const [searchAddress, setSearchAddress] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();

  // Load user session and profile
  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        setIsLoading(true);
        setProfileError(null);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setProfileError('Authentication error. Please log in again.');
          return;
        }

        if (!session?.user) {
          console.log('No user session found');
          setUser(null);
          return;
        }

        setUser(session.user);

        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          if (profileError.code === 'PGRST116') {
            setProfileError('No profile found. Please complete your profile setup.');
          } else {
            setProfileError('Error loading user profile. Please ensure your profile is set up correctly.');
          }
          return;
        }

        if (!profile) {
          setProfileError('No profile found. Please complete your profile setup.');
          return;
        }

        console.log('Profile loaded:', profile);
        setUserProfile(profile);

      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        setProfileError('An unexpected error occurred loading your profile.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndProfile();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserProfile(null);
        router.push('/login');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        loadUserAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Redirect to login if no user after loading
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchAddress.trim()) {
      alert("Please enter an address to search for");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // Search for reports that match the address in location_string or address fields
      const { data: reportData, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (
            name,
            role
          )
        `)
        .or(`location_string.ilike.%${searchAddress}%,address.ilike.%${searchAddress}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching reports:', error);
        throw error;
      }

      console.log('Found reports:', reportData);
      setReports(reportData || []);
      
    } catch (error) {
      console.error("Error searching for reports:", error);
      alert("Failed to search for reports. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openInMaps = (lat: number, lng: number) => {
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  };

  const handleRetryProfile = () => {
    window.location.reload();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth error if no session
  if (!user) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Required</h2>
          <p className="text-red-700 mb-4">Please log in to search for reports.</p>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show profile error
  if (profileError) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Profile Error</h2>
          <p className="text-red-700 mb-4">{profileError}</p>
          <div className="space-x-2">
            <Button onClick={handleRetryProfile} variant="outline">
              Retry
            </Button>
            <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Locate Specific Report</h1>
            <p className="text-gray-600">Search for reports by address or location</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Welcome, <span className="font-semibold">{userProfile?.name}</span> ({userProfile?.role})
        </div>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Reports</span>
          </CardTitle>
          <CardDescription>
            Enter an address, street name, or location to find related incident reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter address or location (e.g., Main Street, Downtown, 123 Oak Ave)"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="w-full"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching || !searchAddress.trim()}
              className="px-6"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results
              {reports.length > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({reports.length} report{reports.length !== 1 ? 's' : ''} found)
                </span>
              )}
            </h2>
          </div>

          {reports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
                <p className="text-gray-600 mb-4">
                  No incident reports were found matching "{searchAddress}". Try searching with:
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• A different address or street name</li>
                  <li>• Broader location terms (e.g., "Downtown" instead of specific address)</li>
                  <li>• Partial matches (e.g., "Oak" instead of "Oak Avenue")</li>
                </ul>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <span>Report #{report.id.slice(0, 8)}</span>
                          <Badge className={getStatusColor(report.status)}>
                            {getStatusText(report.status)}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4 mt-2">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(report.created_at)}</span>
                          </span>
                          {report.profiles && (
                            <span className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>by {report.profiles.name} ({report.profiles.role})</span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Location */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span>Location</span>
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm"><strong>Address:</strong> {report.location_string}</p>
                          {report.address && report.address !== report.location_string && (
                            <p className="text-sm"><strong>Detailed Address:</strong> {report.address}</p>
                          )}
                          {report.latitude && report.longitude && (
                            <div className="flex items-center justify-between">
                              <p className="text-sm">
                                <strong>Coordinates:</strong> {report.latitude}, {report.longitude}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openInMaps(Number(report.latitude), Number(report.longitude))}
                                className="flex items-center space-x-1 text-xs"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>View on Maps</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm leading-relaxed">
                          {report.description}
                        </p>
                      </div>

                      {/* Photos */}
                      {report.photo_urls && report.photo_urls.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Photos ({report.photo_urls.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {report.photo_urls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`Report photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(url, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200 flex items-center justify-center">
                                  <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                        <p><strong>Created:</strong> {formatDate(report.created_at)}</p>
                        <p><strong>Last Updated:</strong> {formatDate(report.updated_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!hasSearched && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Search className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">How to Search</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Enter any part of an address, street name, or location</li>
                  <li>• Search is case-insensitive and matches partial text</li>
                  <li>• Use general terms like "Downtown", "Main Street", or "Park" for broader results</li>
                  <li>• Use specific addresses like "123 Oak Avenue" for precise matches</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}