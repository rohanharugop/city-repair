"use client"

import React, { useEffect, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

interface LocationSelectorProps {
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
}

export function LocationSelector({ onLocationSelect }: LocationSelectorProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to San Francisco if location access fails
            resolve({ lat: 37.7749, lng: -122.4194 });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
    };

    const getAddressFromCoordinates = async (lat: number, lng: number, geocoder: google.maps.Geocoder): Promise<string> => {
      return new Promise((resolve) => {
        geocoder.geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0].formatted_address);
            } else {
              resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          }
        );
      });
    };

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
          version: "weekly",
        });

        const { Map } = await loader.importLibrary("maps");
        const { Marker } = await loader.importLibrary("marker") as { Marker: typeof google.maps.Marker };
        const { Geocoder } = await loader.importLibrary("geocoding") as { Geocoder: typeof google.maps.Geocoder };
        
        // Get current location
        const currentPosition = await getCurrentLocation();
        
        const mapOptions: google.maps.MapOptions = {
          center: currentPosition,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        }

        if (ref.current) {
          const map = new Map(ref.current as HTMLDivElement, mapOptions);
          const geocoder = new Geocoder();
          
          // Current location marker (blue)
          const currentLocationMarker = new Marker({
            position: currentPosition,
            map: map,
            title: "Your Current Location",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              scaledSize: new google.maps.Size(32, 32)
            },
            optimized: true
          });

          // Selected location marker (red) - initially null
          let selectedMarker: google.maps.Marker | null = null;

          // Add click listener to map
          map.addListener("click", async (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              const clickedPosition = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              };

              // Remove previous selected marker if it exists
              if (selectedMarker) {
                selectedMarker.setMap(null);
                selectedMarker = null;
              }

              // Create new selected marker
              selectedMarker = new Marker({
                position: clickedPosition,
                map: map,
                title: "Selected Incident Location",
                icon: {
                  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new google.maps.Size(32, 32)
                },
                animation: google.maps.Animation.DROP,
                optimized: true
              });

              // Update state
              setSelectedLocation(clickedPosition);

              // Get address and call callback
              const currentOnLocationSelect = onLocationSelect; // Capture current callback
              if (currentOnLocationSelect) {
                try {
                  const address = await getAddressFromCoordinates(
                    clickedPosition.lat, 
                    clickedPosition.lng, 
                    geocoder
                  );
                  currentOnLocationSelect({
                    ...clickedPosition,
                    address
                  });
                } catch (error) {
                  currentOnLocationSelect(clickedPosition);
                }
              }
            }
          });

          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
      }
    }
    
    initMap()
  }, []) // Remove onLocationSelect from dependencies
  
  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Select Incident Location</h2>
        <p className="text-sm text-gray-600 mb-2">
          📍 Blue marker shows your current location<br/>
          🔴 Click anywhere on the map to place a red marker for the incident location
        </p>
        {selectedLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium text-green-800">
              ✅ Incident location selected
            </p>
            <p className="text-xs text-green-600">
              Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <div 
        style={{ height: "400px", display: isLoading ? 'none' : 'block' }} 
        className="w-full rounded-lg border"
        ref={ref}
      />
    </div>
  )
}