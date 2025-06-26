"use client"

import { useState, useRef, useEffect } from "react";
import { LocationSelector } from "@/components/LocationSelector";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase'; // Use your existing supabase instance
import { useRouter } from 'next/navigation';

interface SelectedLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface IncidentForm {
  location: string;
  description: string;
  photos: File[];
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
}

export default function ReportIncidentPage() {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<IncidentForm>({
    location: "",
    description: "",
    photos: []
  });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
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
        // Reload profile when user signs in
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

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
    console.log("Location selected:", location);
  };

  const handleReportIncidentClick = () => {
    if (!selectedLocation) {
      alert("Please select a location for the incident");
      return;
    }

    if (!userProfile) {
      alert("User profile not loaded. Please refresh the page and try again.");
      return;
    }

    // Auto-fill the location field
    const locationString = selectedLocation.address || 
      `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
    
    setFormData({
      location: locationString,
      description: "",
      photos: []
    });
    setPhotoPreviews([]);
    setShowForm(true);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== newFiles.length) {
      alert("Only image files are allowed");
    }

    if (formData.photos.length + validFiles.length > 5) {
      alert("Maximum 5 photos allowed");
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }));
    
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleUploadFromDevice = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removePhoto = (index: number) => {
    // Clean up the preview URL
    URL.revokeObjectURL(photoPreviews[index]);
    
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
    
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotosToStorage = async (photos: File[]): Promise<string[]> => {
    if (!userProfile) throw new Error('User profile not available');

    const uploadPromises = photos.map(async (photo, index) => {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}-${index}.${fileExt}`;
      const filePath = `${userProfile.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('report-images')
        .upload(filePath, photo);

      if (error) {
        console.error('Error uploading photo:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      alert("Please provide a description of the incident");
      return;
    }

    if (!userProfile) {
      alert("User profile not available. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      let photoUrls: string[] = [];
      
      // Upload photos to Supabase Storage if any
      if (formData.photos.length > 0) {
        photoUrls = await uploadPhotosToStorage(formData.photos);
      }

      // Insert report data into Supabase reports table
      const { data, error } = await supabase
        .from('reports')
        .insert([
          {
            profile_id: userProfile.id,
            location_string: formData.location,
            description: formData.description,
            latitude: selectedLocation?.lat,
            longitude: selectedLocation?.lng,
            address: selectedLocation?.address,
            photo_urls: photoUrls,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        console.error('Error saving report:', error);
        throw error;
      }

      console.log("Report saved successfully:", data);
      alert("Incident reported successfully!");
      
      // Clean up preview URLs
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      
      // Reset everything
      setSelectedLocation(null);
      setShowForm(false);
      setFormData({ location: "", description: "", photos: [] });
      setPhotoPreviews([]);
      
    } catch (error) {
      console.error("Error submitting incident:", error);
      alert("Failed to submit incident. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Clean up preview URLs
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    
    setShowForm(false);
    setFormData({ location: "", description: "", photos: [] });
    setPhotoPreviews([]);
  };

  const handleRetryProfile = () => {
    window.location.reload();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4">
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
      <div className="mx-auto max-w-4xl p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Required</h2>
          <p className="text-red-700 mb-4">Please log in to report an incident.</p>
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
      <div className="mx-auto max-w-4xl p-4">
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
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Report an Incident</h1>
        <div className="text-sm text-gray-600">
          Welcome, <span className="font-semibold">{userProfile?.name}</span> ({userProfile?.role})
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Location Selection */}
        <div className="bg-white rounded-lg border p-4">
          <LocationSelector onLocationSelect={handleLocationSelect} />
        </div>

        {/* Selected Location Details */}
        {selectedLocation && !showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Selected Location Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Coordinates:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
              {selectedLocation.address && (
                <p><strong>Address:</strong> {selectedLocation.address}</p>
              )}
            </div>
          </div>
        )}

        {/* Incident Report Form */}
        {showForm && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Incident Report Form</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Location Field */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Location will be auto-filled"
                  required
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  This field is automatically filled based on your selected location
                </p>
              </div>

              {/* Description Field */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="Please provide a detailed description of the incident..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe what happened, when it occurred, and any other relevant details
                </p>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos (Optional)
                </label>
                <div className="space-y-3">
                  {/* Upload Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleCameraCapture}
                      variant="outline"
                      disabled={formData.photos.length >= 5}
                      className="flex items-center gap-2"
                    >
                      📷 Take Photo
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUploadFromDevice}
                      variant="outline"
                      disabled={formData.photos.length >= 5}
                      className="flex items-center gap-2"
                    >
                      📁 Upload from Device
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    You can add up to 5 photos. Images help provide better context for the incident.
                  </p>

                  {/* Hidden File Inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />

                  {/* Photo Previews */}
                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Report Incident Button - Only show when location is selected and form is not shown */}
        {selectedLocation && !showForm && (
          <div className="flex justify-end">
            <Button 
              onClick={handleReportIncidentClick}
              className="px-6 py-2"
            >
              Report Incident
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}