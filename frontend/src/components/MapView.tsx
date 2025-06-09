import React, { useEffect, useRef, useState } from 'react';
import { Location } from '../services/locationService';
import { HealthcareProvider } from '../services/placesService';
import './MapView.css';

interface MapViewProps {
  userLocation?: Location | null;
  providers?: HealthcareProvider[];
  onLocationChange?: (location: Location) => void;
  onProviderSelect?: (provider: HealthcareProvider) => void;
}

const MapView: React.FC<MapViewProps> = ({
  userLocation,
  providers = [],
  onLocationChange,
  onProviderSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Force re-render after mount to ensure ref is available
    const timer = setTimeout(() => {
      if (mapRef.current) {
        console.log('MapView: Ref is available, initializing map');
        initializeMap();
      } else {
        console.error('MapView: Ref still not available after timeout');
        setError('Map container failed to mount properly');
        setLoading(false);
      }
    }, 500); // Increased delay
    
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map && userLocation) {
      updateUserLocation(userLocation);
    }
  }, [map, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map) {
      updateProviderMarkers(providers);
    }
  }, [map, providers]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeMap = async () => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      console.log('Initializing map with API key:', apiKey ? 'Present' : 'Missing');
      console.log('Map ref current:', mapRef.current ? 'Available' : 'Not available');
      
      if (!apiKey) {
        throw new Error('Google Maps API key is missing. Please check your .env file.');
      }

      if (!mapRef.current) {
        throw new Error('Map container ref not available during initialization');
      }

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded, creating map...');
        createMapInstance();
        return;
      }

      // Load Google Maps script directly (same as working test)
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        // Add a small delay to ensure everything is ready
        setTimeout(createMapInstance, 100);
      };

      script.onerror = () => {
        throw new Error('Failed to load Google Maps script');
      };

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existingScript) {
        document.head.appendChild(script);
        console.log('Loading Google Maps script...');
      } else {
        console.log('Google Maps script already in DOM');
        if (window.google && window.google.maps) {
          setTimeout(createMapInstance, 100);
        }
      }
    } catch (err) {
      console.error('Map initialization error:', err);
      setError(`Failed to initialize map: ${err}`);
      setLoading(false);
    }
  };

  const createMapInstance = () => {
    try {
      if (!mapRef.current) {
        console.error('Map container ref not found in createMapInstance');
        setError('Map container not found');
        setLoading(false);
        return;
      }

      // Default to New York if no user location
      const defaultLocation = userLocation || { lat: 40.7128, lng: -74.0060 };
      console.log('Creating map at location:', defaultLocation);

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
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              location.address = results[0].formatted_address;
            }
            onLocationChange(location);
          });
        }
      });

      console.log('Map instance created successfully');
      setMap(mapInstance);
      setLoading(false);
    } catch (err) {
      console.error('Error creating map instance:', err);
      setError(`Failed to create map: ${err}`);
      setLoading(false);
    }
  };

  const updateUserLocation = (location: Location) => {
    if (!map) return;

    // Remove existing user marker
    if (userMarker) {
      userMarker.setMap(null);
    }

    // Create new user marker
    const marker = new google.maps.Marker({
      position: location,
      map: map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#007bff" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12)
      }
    });

    setUserMarker(marker);

    // Center map on user location
    map.setCenter(location);
  };

  const updateProviderMarkers = (providers: HealthcareProvider[]) => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Create new markers
    const newMarkers = providers.map((provider, index) => {
      const marker = new google.maps.Marker({
        position: provider.location,
        map: map,
        title: provider.name,
        icon: {
          url: getProviderIcon(provider.type),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="marker-info">
            <h3>${provider.name}</h3>
            <p><strong>Type:</strong> ${provider.type}</p>
            <p><strong>Address:</strong> ${provider.address}</p>
            ${provider.rating ? `<p><strong>Rating:</strong> ${'⭐'.repeat(Math.round(provider.rating))}</p>` : ''}
            ${provider.distance ? `<p><strong>Distance:</strong> ${provider.distance.toFixed(1)} miles</p>` : ''}
            <button onclick="window.selectProvider('${provider.placeId || provider.id}')" class="select-btn">
              Select Provider
            </button>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Set up global function for provider selection
    (window as any).selectProvider = (providerId: string) => {
      const provider = providers.find(p => p.placeId === providerId || p.id === providerId);
      if (provider && onProviderSelect) {
        onProviderSelect(provider);
      }
    };

    // Adjust map bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      
      if (userMarker) {
        const userPosition = userMarker.getPosition();
        if (userPosition) bounds.extend(userPosition);
      }

      map.fitBounds(bounds);
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (onLocationChange) {
            onLocationChange(location);
          }
        },
        (error) => {
          setError(`Geolocation error: ${error.message}`);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  if (loading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <p>Error loading map: {error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  console.log('MapView render - loading:', loading, 'error:', error, 'mapRef:', mapRef.current ? 'exists' : 'null');

  return (
    <div className="map-container">
      <div className="map-controls">
        <button 
          className="location-btn"
          onClick={getCurrentLocation}
          title="Get current location"
        >
          📍 Current Location
        </button>
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#007bff'}}></span>
            Your Location
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#dc3545'}}></span>
            Hospital
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#fd7e14'}}></span>
            Urgent Care
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{backgroundColor: '#28a745'}}></span>
            Pharmacy
          </span>
        </div>
      </div>
      <div 
        ref={mapRef} 
        className="map-display"
        style={{ minHeight: '400px', width: '100%', backgroundColor: '#f0f0f0' }}
      />
    </div>
  );
};

export default MapView;