import React, { useEffect, useRef, useState } from 'react';
import { Location } from '../services/locationService';
import { HealthcareProvider } from '../services/placesService';

interface SimpleMapViewProps {
  userLocation?: Location | null;
  providers?: HealthcareProvider[];
  selectedProvider?: HealthcareProvider | null;
  onLocationChange?: (location: Location) => void;
  onProviderSelect?: (provider: HealthcareProvider) => void;
}

const SimpleMapView: React.FC<SimpleMapViewProps> = ({
  userLocation,
  providers = [],
  selectedProvider,
  onLocationChange,
  onProviderSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [markerProviderMap, setMarkerProviderMap] = useState<Map<string, { marker: google.maps.Marker, infoWindow: google.maps.InfoWindow }>>(new Map());

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (map && providers.length > 0) {
      addProviderMarkers();
    }
  }, [map, providers]);

  useEffect(() => {
    if (selectedProvider && map) {
      highlightProvider(selectedProvider);
    }
  }, [selectedProvider, map, markerProviderMap]);

  const initializeMap = async () => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setStatus('ERROR: Google Maps API key is missing');
        return;
      }

      setStatus(`Loading Google Maps...`);

      // Simple script loading approach (same as SimpleMapTest)
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setStatus('Google Maps script loaded, creating map...');
        
        if (!mapRef.current) {
          setStatus('ERROR: Map container not found');
          return;
        }

        try {
          const defaultLocation = userLocation || { lat: 40.7128, lng: -74.0060 }; // NYC
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: defaultLocation,
            zoom: 13,
            styles: [
              {
                featureType: 'poi.medical',
                elementType: 'geometry',
                stylers: [{ color: '#ffeaa7' }]
              }
            ]
          });

          // Add click listener for location selection
          mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng && onLocationChange) {
              const location: Location = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              };
              onLocationChange(location);
            }
          });

          setMap(mapInstance);
          setStatus('SUCCESS: Map created and displayed');
        } catch (mapError) {
          setStatus(`ERROR creating map: ${mapError}`);
        }
      };

      script.onerror = () => {
        setStatus('ERROR: Failed to load Google Maps script');
      };

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        setStatus('Google Maps script already loaded');
        if (window.google && window.google.maps && mapRef.current) {
          const defaultLocation = userLocation || { lat: 40.7128, lng: -74.0060 };
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: defaultLocation,
            zoom: 13,
          });
          setMap(mapInstance);
          setStatus('SUCCESS: Map created with existing script');
        }
      } else {
        document.head.appendChild(script);
      }

    } catch (error) {
      setStatus(`ERROR: ${error}`);
    }
  };

  const addProviderMarkers = () => {
    if (!map) return;

    // Clear existing markers and map
    markers.forEach(marker => marker.setMap(null));
    markerProviderMap.clear();
    setMarkers([]);

    const newMarkers: google.maps.Marker[] = [];
    const newMarkerMap = new Map<string, { marker: google.maps.Marker, infoWindow: google.maps.InfoWindow }>();

    // Add new markers
    providers.forEach(provider => {
      // Ensure we have a proper LatLng object
      const position = new google.maps.LatLng(provider.location.lat, provider.location.lng);
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: provider.name,
        icon: {
          url: getProviderIcon(provider.type),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px; padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 1rem;">${provider.name}</h3>
            <p style="margin: 4px 0; font-size: 0.9rem; color: #555;"><strong>Type:</strong> ${provider.type}</p>
            <p style="margin: 4px 0; font-size: 0.9rem; color: #555;"><strong>Address:</strong> ${provider.address}</p>
            ${provider.rating ? `<p style="margin: 4px 0; font-size: 0.9rem; color: #555;"><strong>Rating:</strong> ${'⭐'.repeat(Math.round(provider.rating))}</p>` : ''}
            ${provider.distance ? `<p style="margin: 4px 0; font-size: 0.9rem; color: #555;"><strong>Distance:</strong> ${provider.distance.toFixed(1)} miles</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        // Close all other info windows
        newMarkerMap.forEach(({ infoWindow: otherWindow }) => {
          otherWindow.close();
        });
        
        infoWindow.open(map, marker);
        if (onProviderSelect) {
          onProviderSelect(provider);
        }
      });

      newMarkers.push(marker);
      newMarkerMap.set(provider.id, { marker, infoWindow });
    });

    setMarkers(newMarkers);
    setMarkerProviderMap(newMarkerMap);

    // Adjust map bounds to show all markers
    if (newMarkers.length > 0) {
      try {
        const bounds = new google.maps.LatLngBounds();
        newMarkers.forEach(marker => {
          const position = marker.getPosition();
          if (position) {
            bounds.extend(position);
          }
        });
        
        // Only fit bounds if we have valid bounds
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error setting map bounds:', error);
        // Fallback to centering on first marker
        if (newMarkers.length > 0) {
          const firstPosition = newMarkers[0].getPosition();
          if (firstPosition) {
            map.setCenter(firstPosition);
            map.setZoom(13);
          }
        }
      }
    }
  };

  const highlightProvider = (provider: HealthcareProvider) => {
    const markerData = markerProviderMap.get(provider.id);
    if (markerData && map) {
      const { marker, infoWindow } = markerData;
      
      // Close all other info windows first
      markerProviderMap.forEach(({ infoWindow: otherWindow }) => {
        otherWindow.close();
      });
      
      // Center map on the selected marker
      const position = marker.getPosition();
      if (position) {
        map.setCenter(position);
        map.setZoom(15); // Zoom in to show detail
      }
      
      // Open the info window for this marker
      infoWindow.open(map, marker);
      
      // Optional: Add a bounce animation
      marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => {
        marker.setAnimation(null);
      }, 2000);
    }
  };

  const getProviderIcon = (type: string): string => {
    const iconColor = getProviderColor(type);
    return `data:image/svg+xml;charset=UTF-8,` + encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C10.48 2 6 6.48 6 12C6 20 16 30 16 30S26 20 26 12C26 6.48 21.52 2 16 2Z" fill="${iconColor}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="white"/>
        <text x="16" y="16" text-anchor="middle" fill="${iconColor}" font-size="8" font-weight="bold">${getProviderSymbol(type)}</text>
      </svg>
    `);
  };

  const getProviderColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'hospital': return '#dc3545';
      case 'urgent_care': return '#fd7e14';
      case 'pharmacy': return '#28a745';
      case 'clinic': return '#007bff';
      case 'specialist': return '#6f42c1';
      default: return '#6c757d';
    }
  };

  const getProviderSymbol = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'hospital': return 'H';
      case 'urgent_care': return 'U';
      case 'pharmacy': return 'P';
      case 'clinic': return 'C';
      case 'specialist': return 'S';
      default: return 'M';
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div style={{ padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <strong>Map Status:</strong> {status}
      </div>
      <div 
        ref={mapRef} 
        style={{ 
          height: 'calc(100% - 50px)', 
          width: '100%', 
          border: '2px solid #ccc',
          backgroundColor: '#f0f0f0'
        }} 
      />
    </div>
  );
};

export default SimpleMapView;