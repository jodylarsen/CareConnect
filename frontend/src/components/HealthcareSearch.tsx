import React, { useState, useEffect } from 'react';
import SimpleMapView from './SimpleMapView';
import LocationService, { Location, LocationError } from '../services/locationService';
import PlacesService, { HealthcareProvider, SearchFilters } from '../services/placesService';
import DatabricksService, { SymptomRequest, HealthcareRecommendation } from '../services/databricksService';
import './HealthcareSearch.css';

// Remove duplicate interfaces - using imports from services

interface SymptomAssessment {
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  duration: string;
  description: string;
}

const HealthcareSearch: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider | null>(null);
  const [searchMode, setSearchMode] = useState<'location' | 'symptoms'>('location');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<HealthcareRecommendation | null>(null);

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    radius: 5000, // meters
    minRating: 0,
    isOpen: false
  });

  // Symptom assessment
  const [symptoms, setSymptoms] = useState<SymptomAssessment>({
    symptoms: [],
    severity: 'mild',
    duration: '',
    description: ''
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation && searchMode === 'location') {
      searchNearbyProviders();
    }
  }, [userLocation, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setUserLocation(location);
    } catch (error: any) {
      const locationError = error as LocationError;
      setError(`Unable to get your location: ${locationError.message}`);
      
      // Try IP-based location as fallback
      try {
        const ipLocation = await LocationService.getLocationFromIP();
        setUserLocation(ipLocation);
        setError('Using approximate location based on IP address.');
      } catch {
        setError('Unable to determine your location. Please search manually.');
      }
    }
  };

  const searchNearbyProviders = async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);

    try {
      // Use enhanced PlacesService for better results
      const response = await PlacesService.searchNearbyProviders(userLocation, filters);
      setProviders(response);
    } catch (err: any) {
      setError(`Failed to search for healthcare providers: ${err.message}`);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Removed old searchGooglePlaces function - now using PlacesService

  const handleSymptomSearch = async () => {
    setLoading(true);
    setError(null);
    setSearchMode('symptoms');
    setAiRecommendation(null);

    try {
      if (!userLocation) {
        throw new Error('Location required for symptom analysis');
      }

      // Use Databricks service for real AI analysis
      const request: SymptomRequest = {
        symptoms: symptoms.symptoms,
        severity: symptoms.severity,
        duration: symptoms.duration,
        description: symptoms.description,
        location: userLocation,
        userProfile: {
          // You could expand this with user profile data
          age: undefined,
          gender: undefined,
          medicalHistory: [],
          allergies: [],
          medications: [],
          chronicConditions: []
        }
      };

      const analysis = await DatabricksService.analyzeSymptoms(request);
      setAiRecommendation(analysis);
      
      // Search for providers based on AI recommendation
      const recommendedFilters: SearchFilters = {
        ...filters,
        type: analysis.recommendedCareType === 'emergency' ? 'hospital' :
              analysis.recommendedCareType === 'urgent_care' ? 'urgent_care' :
              analysis.recommendedCareType === 'pharmacy' ? 'pharmacy' :
              analysis.recommendedCareType === 'hospital' ? 'hospital' : 'clinic'
      };
      
      const response = await PlacesService.searchNearbyProviders(userLocation, recommendedFilters);
      setProviders(response);
      
    } catch (err: any) {
      setError(`Failed to analyze symptoms: ${err.message}`);
      console.error('Symptom analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Removed old analyzeSymptoms function - now using DatabricksService

  const handleLocationChange = (location: Location) => {
    setUserLocation(location);
  };

  const handleProviderSelect = (provider: HealthcareProvider) => {
    setSelectedProvider(provider);
  };

  const addSymptom = (symptom: string) => {
    if (symptom && !symptoms.symptoms.includes(symptom)) {
      setSymptoms(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, symptom]
      }));
    }
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter(s => s !== symptom)
    }));
  };

  return (
    <div className="healthcare-search">
      <div className="search-header">
        <h2>Find Healthcare Providers</h2>
        <div className="search-mode-toggle">
          <button 
            className={`mode-btn ${searchMode === 'location' ? 'active' : ''}`}
            onClick={() => setSearchMode('location')}
          >
            📍 Location Search
          </button>
          <button 
            className={`mode-btn ${searchMode === 'symptoms' ? 'active' : ''}`}
            onClick={() => setSearchMode('symptoms')}
          >
            🩺 Symptom Checker
          </button>
        </div>
      </div>

      <div className="search-content">
        <div className="search-panel">
          {searchMode === 'location' ? (
            <div className="location-search">
              <div className="search-filters">
                <h3>Search Filters</h3>
                
                <div className="filter-group">
                  <label>Provider Type:</label>
                  <select 
                    value={filters.type} 
                    onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                  >
                    <option value="all">All Types</option>
                    <option value="hospital">Hospitals</option>
                    <option value="urgent_care">Urgent Care</option>
                    <option value="clinic">Clinics</option>
                    <option value="pharmacy">Pharmacies</option>
                    <option value="dentist">Dentists</option>
                    <option value="doctor">Doctors</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Radius: {Math.round((filters.radius || 5000) / 1609.34)} miles</label>
                  <input 
                    type="range" 
                    min="1609" 
                    max="40000" 
                    step="1609"
                    value={filters.radius || 5000}
                    onChange={(e) => setFilters({...filters, radius: Number(e.target.value)})}
                  />
                </div>

                <div className="filter-group">
                  <label>Minimum Rating:</label>
                  <select 
                    value={filters.minRating || 0} 
                    onChange={(e) => setFilters({...filters, minRating: Number(e.target.value)})}
                  >
                    <option value="0">Any Rating</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={filters.isOpen || false}
                      onChange={(e) => setFilters({...filters, isOpen: e.target.checked})}
                    />
                    Open Now
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="symptom-search">
              <h3>Describe Your Symptoms</h3>
              
              <div className="symptom-input">
                <div className="common-symptoms">
                  <h4>Common Symptoms:</h4>
                  <div className="symptom-buttons">
                    {['Headache', 'Fever', 'Cough', 'Sore Throat', 'Nausea', 'Chest Pain', 'Shortness of Breath'].map(symptom => (
                      <button 
                        key={symptom}
                        className={`symptom-btn ${symptoms.symptoms.includes(symptom) ? 'selected' : ''}`}
                        onClick={() => symptoms.symptoms.includes(symptom) ? removeSymptom(symptom) : addSymptom(symptom)}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="selected-symptoms">
                  <h4>Your Symptoms:</h4>
                  <div className="symptom-tags">
                    {symptoms.symptoms.map(symptom => (
                      <span key={symptom} className="symptom-tag">
                        {symptom}
                        <button onClick={() => removeSymptom(symptom)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="symptom-details">
                  <div className="detail-group">
                    <label>Severity:</label>
                    <select 
                      value={symptoms.severity}
                      onChange={(e) => setSymptoms({...symptoms, severity: e.target.value as any})}
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="detail-group">
                    <label>Duration:</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 2 days, 1 week"
                      value={symptoms.duration}
                      onChange={(e) => setSymptoms({...symptoms, duration: e.target.value})}
                    />
                  </div>

                  <div className="detail-group">
                    <label>Additional Details:</label>
                    <textarea 
                      placeholder="Describe any additional symptoms or context..."
                      value={symptoms.description}
                      onChange={(e) => setSymptoms({...symptoms, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>

                <button 
                  className="analyze-btn"
                  onClick={handleSymptomSearch}
                  disabled={symptoms.symptoms.length === 0 || loading}
                >
                  {loading ? 'Analyzing...' : 'Get Recommendations'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="map-section">
          <SimpleMapView 
            userLocation={userLocation}
            providers={providers}
            selectedProvider={selectedProvider}
            onLocationChange={handleLocationChange}
            onProviderSelect={handleProviderSelect}
          />
        </div>
      </div>

      {aiRecommendation && (
        <div className="ai-recommendation-section">
          <h3>🤖 AI Health Recommendation</h3>
          <div className="recommendation-card">
            <div className="recommendation-header">
              <span className={`care-type ${aiRecommendation.recommendedCareType}`}>
                {aiRecommendation.recommendedCareType.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`urgency ${aiRecommendation.urgency}`}>
                {aiRecommendation.urgency.toUpperCase()}
              </span>
              <span className="confidence">
                {(aiRecommendation.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
            <p className="reasoning">{aiRecommendation.reasoning}</p>
            
            {aiRecommendation.recommendations.length > 0 && (
              <div className="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                  {aiRecommendation.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {aiRecommendation.when_to_seek_emergency_care.length > 0 && (
              <div className="emergency-warning">
                <h4>⚠️ Seek Emergency Care If:</h4>
                <ul>
                  {aiRecommendation.when_to_seek_emergency_care.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {providers.length > 0 && (
        <div className="results-section">
          <h3>Healthcare Providers ({providers.length} found)</h3>
          <div className="provider-list">
            {providers.map(provider => (
              <div 
                key={provider.id} 
                className={`provider-card ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
                onClick={() => handleProviderSelect(provider)}
              >
                <div className="provider-header">
                  <h4>{provider.name}</h4>
                  <span className={`provider-type ${provider.type}`}>
                    {provider.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="provider-address">{provider.address}</p>
                {provider.rating && (
                  <div className="provider-rating">
                    {'⭐'.repeat(Math.round(provider.rating))} {provider.rating.toFixed(1)}
                  </div>
                )}
                {provider.distance && (
                  <p className="provider-distance">{provider.distance.toFixed(1)} miles away</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthcareSearch;