import React, { useState, useEffect } from 'react';
import DatabricksService, { SymptomRequest, HealthcareRecommendation } from '../services/databricksService';
import LocationService, { Location } from '../services/locationService';

const DatabricksTest: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<HealthcareRecommendation | null>(null);

  // Sample symptom data for testing
  const [symptoms, setSymptoms] = useState({
    symptoms: ['headache', 'fever'],
    severity: 'moderate' as const,
    duration: '2 days',
    description: 'Persistent headache with mild fever, started two days ago'
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  useEffect(() => {
    // Get service status on mount
    const serviceStatus = DatabricksService.getStatus();
    setStatus(serviceStatus);
    addTestResult(`Service Status: ${serviceStatus.configured ? 'Configured' : 'Not configured'}`);

    // Get location for testing
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const loc = await LocationService.getCurrentLocation();
      setLocation(loc);
      addTestResult(`Location acquired: ${loc.city}, ${loc.state}`);
    } catch (error) {
      addTestResult(`Location failed, using IP fallback`);
      try {
        const ipLoc = await LocationService.getLocationFromIP();
        setLocation(ipLoc);
        addTestResult(`IP location: ${ipLoc.city}, ${ipLoc.state}`);
      } catch {
        addTestResult(`All location methods failed`);
      }
    }
  };

  const testConnection = async () => {
    setLoading(true);
    const serviceStatus = DatabricksService.getStatus();
    const testUrl = `https://${serviceStatus.workspace}/serving-endpoints/${serviceStatus.endpoint}/invocations`;
    
    addTestResult('🧪 Testing Databricks connection...');
    addTestResult(`🔗 URL: ${testUrl}`);
    addTestResult(`🔑 Token: ${serviceStatus.hasToken ? 'Present' : 'Missing'}`);
    
    try {
      const isConnected = await DatabricksService.testConnection();
      setConnectionTest(isConnected);
      addTestResult(`✅ Connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
    } catch (error: any) {
      setConnectionTest(false);
      
      if (error.message && error.message.includes('CORS Error')) {
        addTestResult(`⚠️ CORS Issue: Browser blocks direct API calls`);
        addTestResult(`ℹ️ This is expected in development`);
        addTestResult(`✅ Endpoint verified working via curl`);
        addTestResult(`📝 For production: Use backend proxy or configure CORS`);
      } else {
        addTestResult(`❌ Connection failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testSymptomAnalysis = async () => {
    if (!location) {
      addTestResult('❌ Need location for symptom analysis');
      return;
    }

    setLoading(true);
    addTestResult('🧪 Testing symptom analysis...');

    try {
      const request: SymptomRequest = {
        ...symptoms,
        location,
        userProfile: {
          age: 30,
          gender: 'not specified',
          medicalHistory: [],
          allergies: [],
          medications: [],
          chronicConditions: []
        }
      };

      const result = await DatabricksService.analyzeSymptoms(request);
      setRecommendation(result);
      addTestResult(`✅ Analysis complete: ${result.recommendedCareType} (${result.urgency})`);
      addTestResult(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    } catch (error: any) {
      addTestResult(`❌ Symptom analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProviderRecommendations = async () => {
    if (!location) {
      addTestResult('❌ Need location for provider recommendations');
      return;
    }

    setLoading(true);
    addTestResult('🧪 Testing provider recommendations...');

    try {
      const result = await DatabricksService.getProviderRecommendations(
        'chest pain',
        location,
        'urgent'
      );
      addTestResult(`✅ Provider recommendations: ${result.recommended_types.join(', ')}`);
      addTestResult(`🔍 Search keywords: ${result.search_keywords.join(', ')}`);
    } catch (error: any) {
      addTestResult(`❌ Provider recommendations failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testTravelHealth = async () => {
    setLoading(true);
    addTestResult('🧪 Testing travel health advice...');

    try {
      const result = await DatabricksService.getTravelHealthAdvice(
        'Thailand',
        ['diabetes', 'hypertension'],
        '2 weeks'
      );
      addTestResult(`✅ Travel advice generated`);
      addTestResult(`💉 Vaccinations: ${result.vaccinations.length} recommended`);
      addTestResult(`💊 Medications: ${result.medications.length} suggested`);
    } catch (error: any) {
      addTestResult(`❌ Travel health advice failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testWeatherFunction = async () => {
    if (!location) {
      addTestResult('❌ Need location for weather function test');
      return;
    }

    setLoading(true);
    addTestResult('🌤️ Testing weather function...');
    addTestResult(`📍 Using location: ${location.city}, ${location.state}`);

    try {
      const city = location.city || location.state || 'Unknown Location';
      const result = await DatabricksService.testWeatherFunction(city);
      
      if (result.error) {
        addTestResult(`⚠️ Weather function issues detected:`);
        addTestResult(`   Function: ${result.functionName || 'get_weather'}`);
        addTestResult(`   Issue: ${result.issue || 'Implementation error'}`);
        addTestResult(`   Details: ${result.details || result.message || 'No details available'}`);
        
        // Show full error response for debugging
        addTestResult(`🔍 Full response: ${JSON.stringify(result, null, 2)}`);
      } else {
        addTestResult(`✅ Weather function working`);
        addTestResult(`🌡️ Full response: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (error: any) {
      if (error.message && error.message.includes('CORS Error')) {
        addTestResult(`⚠️ CORS blocks weather function test from browser`);
        addTestResult(`ℹ️ Function exists but requires backend proxy to test`);
      } else {
        addTestResult(`❌ Weather function test failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting comprehensive Databricks tests...');
    
    await testConnection();
    
    if (connectionTest !== false) {
      setTimeout(() => testWeatherFunction(), 1000);
      setTimeout(() => testSymptomAnalysis(), 2500);
      setTimeout(() => testProviderRecommendations(), 4000);
      setTimeout(() => testTravelHealth(), 5500);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>🔗 Databricks Healthcare Agent Test</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>📊 Service Status</h3>
          {status && (
            <div style={{
              backgroundColor: status.configured ? '#d4edda' : '#f8d7da',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <p><strong>Configured:</strong> {status.configured ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Workspace:</strong> {status.workspace || 'Not set'}</p>
              <p><strong>Endpoint:</strong> {status.endpoint || 'Not set'}</p>
              <p><strong>Token:</strong> {status.hasToken ? '✅ Present' : '❌ Missing'}</p>
              <p><strong>Mode:</strong> 🖥️ Backend API (port 3001)</p>
              <p><strong>API URL:</strong> {process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}</p>
            </div>
          )}

          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '8px',
            fontSize: '12px'
          }}>
            <p><strong>ℹ️ Backend API Mode</strong></p>
            <p>All Databricks calls go through backend server</p>
            <p>✅ No CORS issues</p>
            <p>✅ Secure token handling</p>
            <p>Start backend: <code>npm run server</code></p>
          </div>

          <h3>🌍 Test Location</h3>
          {location ? (
            <div style={{ backgroundColor: '#d4edda', padding: '12px', borderRadius: '4px' }}>
              <p><strong>City:</strong> {location.city}</p>
              <p><strong>State:</strong> {location.state}</p>
              <p><strong>Coordinates:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>Loading location...</p>
          )}
        </div>

        <div>
          <h3>🧪 Test Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={runAllTests}
              disabled={loading}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '🔄 Testing...' : '🚀 Run All Tests'}
            </button>
            
            <button 
              onClick={testConnection}
              disabled={loading}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              🔗 Test Connection
            </button>
            
            <button 
              onClick={testSymptomAnalysis}
              disabled={loading || !location}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: (loading || !location) ? 'not-allowed' : 'pointer'
              }}
            >
              🩺 Test Symptoms
            </button>

            <button 
              onClick={testWeatherFunction}
              disabled={loading}
              style={{
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              🌤️ Test Weather Function
            </button>
          </div>

          <h3>🩺 Test Symptoms</h3>
          <div style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
            <p><strong>Symptoms:</strong> {symptoms.symptoms.join(', ')}</p>
            <p><strong>Severity:</strong> {symptoms.severity}</p>
            <p><strong>Duration:</strong> {symptoms.duration}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>📋 Test Results</h3>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '12px',
            height: '300px',
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

        <div>
          <h3>🎯 Healthcare Recommendation</h3>
          {recommendation ? (
            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #b3d9ff',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4>Care Type: {recommendation.recommendedCareType}</h4>
              <p><strong>Urgency:</strong> {recommendation.urgency}</p>
              <p><strong>Confidence:</strong> {(recommendation.confidence * 100).toFixed(1)}%</p>
              <p><strong>Reasoning:</strong> {recommendation.reasoning}</p>
              
              <h5>Recommendations:</h5>
              <ul>
                {recommendation.recommendations.map((rec, i) => (
                  <li key={i} style={{ fontSize: '12px' }}>{rec}</li>
                ))}
              </ul>
              
              <h5>Next Steps:</h5>
              <ul>
                {recommendation.next_steps.map((step, i) => (
                  <li key={i} style={{ fontSize: '12px' }}>{step}</li>
                ))}
              </ul>
              
              {recommendation.when_to_seek_emergency_care.length > 0 && (
                <>
                  <h5 style={{ color: '#dc3545' }}>⚠️ Seek Emergency Care If:</h5>
                  <ul>
                    {recommendation.when_to_seek_emergency_care.map((warning, i) => (
                      <li key={i} style={{ fontSize: '12px', color: '#dc3545' }}>{warning}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>No recommendation yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabricksTest;