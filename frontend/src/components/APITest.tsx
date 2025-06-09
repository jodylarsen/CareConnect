import React, { useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import './APITest.css';

interface APITestResult {
  name: string;
  status: 'testing' | 'success' | 'error';
  message: string;
  details?: any;
}

const APITest: React.FC = () => {
  const [testResults, setTestResults] = useState<APITestResult[]>([
    { name: 'Google OAuth 2.0', status: 'testing', message: 'Checking OAuth configuration...' },
    { name: 'Google Maps JavaScript API', status: 'testing', message: 'Loading Maps API...' },
    { name: 'Google Places API', status: 'testing', message: 'Testing Places service...' },
    { name: 'Google Geolocation API', status: 'testing', message: 'Testing Geolocation...' },
    { name: 'Google Geocoding API', status: 'testing', message: 'Testing Geocoding service...' }
  ]);

  const updateTestResult = (index: number, status: 'success' | 'error', message: string, details?: any) => {
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, details } : result
    ));
  };

  useEffect(() => {
    runAPITests();
  }, []);

  const runAPITests = async () => {
    // Test 1: Google OAuth 2.0
    testOAuth();
    
    // Test 2-5: Google Maps APIs
    await testGoogleMapsAPIs();
  };

  const testOAuth = () => {
    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        updateTestResult(0, 'error', 'Client ID not found in environment variables');
        return;
      }

      if (clientId.includes('apps.googleusercontent.com')) {
        updateTestResult(0, 'success', `OAuth Client ID configured: ${clientId.substring(0, 20)}...`);
      } else {
        updateTestResult(0, 'error', 'Invalid OAuth Client ID format');
      }
    } catch (error) {
      updateTestResult(0, 'error', `OAuth test failed: ${error}`);
    }
  };

  const testGoogleMapsAPIs = async () => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        updateTestResult(1, 'error', 'Maps API key not found');
        updateTestResult(2, 'error', 'Places API requires Maps API key');
        updateTestResult(3, 'error', 'Geolocation API requires Maps API key');
        updateTestResult(4, 'error', 'Geocoding API requires Maps API key');
        return;
      }

      // Test Maps JavaScript API
      try {
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        const google = await loader.load();
        updateTestResult(1, 'success', 'Maps JavaScript API loaded successfully');

        // Test Places API
        try {
          const service = new google.maps.places.PlacesService(document.createElement('div'));
          updateTestResult(2, 'success', 'Places API service initialized');
        } catch (error) {
          updateTestResult(2, 'error', `Places API error: ${error}`);
        }

        // Test Geolocation API
        testGeolocation();

        // Test Geocoding API
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: 'New York, NY' }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              updateTestResult(4, 'success', `Geocoding API working: ${results[0].formatted_address}`);
            } else {
              updateTestResult(4, 'error', `Geocoding failed: ${status}`);
            }
          });
        } catch (error) {
          updateTestResult(4, 'error', `Geocoding API error: ${error}`);
        }

      } catch (error) {
        updateTestResult(1, 'error', `Maps API loading failed: ${error}`);
        updateTestResult(2, 'error', 'Cannot test Places API - Maps API failed');
        updateTestResult(4, 'error', 'Cannot test Geocoding API - Maps API failed');
      }
    } catch (error) {
      console.error('API testing error:', error);
    }
  };

  const testGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateTestResult(3, 'success', 
            `Geolocation working: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          );
        },
        (error) => {
          let errorMessage = 'Unknown geolocation error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied location permission';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout';
              break;
          }
          updateTestResult(3, 'error', `Geolocation error: ${errorMessage}`);
        },
        { timeout: 10000 }
      );
    } else {
      updateTestResult(3, 'error', 'Geolocation not supported by browser');
    }
  };

  const retryTest = (index: number) => {
    const updatedResults = [...testResults];
    updatedResults[index] = { ...updatedResults[index], status: 'testing', message: 'Retrying...' };
    setTestResults(updatedResults);

    setTimeout(() => {
      switch (index) {
        case 0:
          testOAuth();
          break;
        case 1:
        case 2:
        case 4:
          testGoogleMapsAPIs();
          break;
        case 3:
          testGeolocation();
          break;
      }
    }, 500);
  };

  return (
    <div className="api-test">
      <h2>🔧 API Connection Tests</h2>
      <p>Testing connections to all required Google APIs...</p>

      <div className="test-results">
        {testResults.map((result, index) => (
          <div key={index} className={`test-item ${result.status}`}>
            <div className="test-header">
              <span className={`status-icon ${result.status}`}>
                {result.status === 'testing' && '⏳'}
                {result.status === 'success' && '✅'}
                {result.status === 'error' && '❌'}
              </span>
              <h3>{result.name}</h3>
              {result.status === 'error' && (
                <button 
                  className="retry-btn" 
                  onClick={() => retryTest(index)}
                  title="Retry test"
                >
                  🔄
                </button>
              )}
            </div>
            <p className="test-message">{result.message}</p>
            {result.details && (
              <pre className="test-details">{JSON.stringify(result.details, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>

      <div className="environment-info">
        <h3>🔧 Environment Configuration</h3>
        <div className="env-item">
          <strong>Client ID:</strong> {process.env.REACT_APP_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}
        </div>
        <div className="env-item">
          <strong>Maps API Key:</strong> {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing'}
        </div>
        <div className="env-item">
          <strong>Redirect URI:</strong> {process.env.REACT_APP_GOOGLE_REDIRECT_URI || 'Default: http://localhost:3000/auth/callback'}
        </div>
      </div>

      <div className="test-actions">
        <button 
          className="btn btn-primary" 
          onClick={runAPITests}
        >
          🔄 Run All Tests Again
        </button>
      </div>
    </div>
  );
};

export default APITest;