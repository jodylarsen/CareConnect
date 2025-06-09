import React, { useState, useEffect } from 'react';
import LocationService, { Location, LocationError } from '../services/locationService';
import PlacesService, { HealthcareProvider, SearchFilters } from '../services/placesService';

const GoogleServicesTest: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testLocationServices = async () => {
    setLoading(true);
    setError(null);
    addTestResult('🧪 Testing Location Services...');

    try {
      // Test permission check
      const permission = await LocationService.checkLocationPermission();
      addTestResult(`📍 Location permission: ${permission}`);

      // Test current location
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      addTestResult(`✅ Got current location: ${currentLocation.address || `${currentLocation.lat}, ${currentLocation.lng}`}`);

      // Test reverse geocoding
      if (!currentLocation.address) {
        const enhancedLocation = await LocationService.reverseGeocode(currentLocation);
        setLocation(enhancedLocation);
        addTestResult(`✅ Reverse geocoded: ${enhancedLocation.address}`);
      }

      // Test forward geocoding
      const geocodedLocations = await LocationService.forwardGeocode('New York, NY');
      addTestResult(`✅ Forward geocoded "New York, NY": Found ${geocodedLocations.length} results`);

      // Test distance calculation
      if (geocodedLocations.length > 0) {
        const distance = LocationService.calculateDistance(currentLocation, geocodedLocations[0]);
        addTestResult(`✅ Distance to NYC: ${distance.toFixed(1)} miles`);
      }

    } catch (err: any) {
      const error = err as LocationError;
      addTestResult(`❌ Location test failed: ${error.message}`);
      setError(error.message);

      // Try IP fallback
      try {
        const ipLocation = await LocationService.getLocationFromIP();
        setLocation(ipLocation);
        addTestResult(`✅ IP fallback successful: ${ipLocation.city}, ${ipLocation.state}`);
      } catch {
        addTestResult(`❌ IP fallback also failed`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testPlacesServices = async () => {
    if (!location) {
      addTestResult('❌ Need location first for Places API tests');
      return;
    }

    setLoading(true);
    addTestResult('🧪 Testing Places Services...');

    try {
      // Test nearby search
      const filters: SearchFilters = {
        type: 'hospital',
        radius: 5000,
        minRating: 3
      };

      const nearbyProviders = await PlacesService.searchNearbyProviders(location, filters);
      setProviders(nearbyProviders);
      addTestResult(`✅ Found ${nearbyProviders.length} nearby hospitals`);

      // Test text search
      const textResults = await PlacesService.searchByText('urgent care', location, 10000);
      addTestResult(`✅ Text search found ${textResults.length} urgent care facilities`);

      // Test specialist search
      const specialists = await PlacesService.findSpecialists('cardiology', location, 15000);
      addTestResult(`✅ Found ${specialists.length} cardiology specialists`);

      // Test place details (if we have providers)
      if (nearbyProviders.length > 0) {
        const firstProvider = nearbyProviders[0];
        try {
          const details = await PlacesService.getPlaceDetails(firstProvider.placeId);
          setSelectedProvider(details);
          addTestResult(`✅ Got detailed info for: ${details.name}`);
        } catch {
          addTestResult(`⚠️ Could not get details for ${firstProvider.name}`);
        }
      }

    } catch (err: any) {
      addTestResult(`❌ Places test failed: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testSpecialtySearch = async (specialty: string) => {
    if (!location) return;

    setLoading(true);
    addTestResult(`🧪 Testing specialty search: ${specialty}...`);

    try {
      const results = await PlacesService.findSpecialists(specialty, location, 20000);
      addTestResult(`✅ Found ${results.length} ${specialty} specialists`);
      
      if (results.length > 0) {
        // Show details of first result
        const first = results[0];
        addTestResult(`📍 Example: ${first.name} - ${first.address} (${first.rating}⭐)`);
      }
    } catch (err: any) {
      addTestResult(`❌ ${specialty} search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    setError(null);
    
    addTestResult('🚀 Starting comprehensive Google Services test...');
    
    await testLocationServices();
    
    // Wait a bit before places tests
    setTimeout(async () => {
      await testPlacesServices();
      
      // Test specialty searches
      setTimeout(() => testSpecialtySearch('dialysis'), 1000);
      setTimeout(() => testSpecialtySearch('covid'), 2000);
      setTimeout(() => testSpecialtySearch('sti'), 3000);
      
      addTestResult('✅ All tests completed!');
    }, 2000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Google Services Integration Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '🔄 Testing...' : '🚀 Run All Tests'}
        </button>
        
        <button 
          onClick={testLocationServices}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          📍 Test Location
        </button>
        
        <button 
          onClick={testPlacesServices}
          disabled={loading || !location}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: (loading || !location) ? 'not-allowed' : 'pointer'
          }}
        >
          🏥 Test Places
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>🌍 Current Location</h3>
          {location ? (
            <div style={{ backgroundColor: '#d4edda', padding: '12px', borderRadius: '4px' }}>
              <p><strong>Coordinates:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              {location.address && <p><strong>Address:</strong> {location.address}</p>}
              {location.city && <p><strong>City:</strong> {location.city}</p>}
              {location.state && <p><strong>State:</strong> {location.state}</p>}
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>No location data yet</p>
          )}

          <h3>🏥 Found Providers ({providers.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {providers.slice(0, 5).map(provider => (
              <div 
                key={provider.id}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '8px',
                  margin: '4px 0',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedProvider(provider)}
              >
                <strong>{provider.name}</strong>
                <br />
                <small>{provider.type} • {provider.rating}⭐ • {provider.distance?.toFixed(1)}mi</small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>📋 Test Results</h3>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '12px',
            height: '400px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {result}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedProvider && (
        <div style={{ marginTop: '20px' }}>
          <h3>🔍 Selected Provider Details</h3>
          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <h4>{selectedProvider.name}</h4>
            <p><strong>Type:</strong> {selectedProvider.type}</p>
            <p><strong>Address:</strong> {selectedProvider.address}</p>
            <p><strong>Rating:</strong> {selectedProvider.rating}⭐ ({selectedProvider.totalRatings} reviews)</p>
            {selectedProvider.phone && <p><strong>Phone:</strong> {selectedProvider.phone}</p>}
            {selectedProvider.website && (
              <p><strong>Website:</strong> <a href={selectedProvider.website} target="_blank" rel="noopener noreferrer">
                {selectedProvider.website}
              </a></p>
            )}
            {selectedProvider.distance && <p><strong>Distance:</strong> {selectedProvider.distance.toFixed(1)} miles</p>}
            <p><strong>Place ID:</strong> <code>{selectedProvider.placeId}</code></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleServicesTest;