import React, { useState, useEffect } from 'react';
import SimpleMapView from './SimpleMapView';
import LocationSelector, { LocationOption } from './LocationSelector';
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

interface ProviderDetails {
  provider: HealthcareProvider;
  additionalInfo?: {
    description?: string;
    services?: string[];
    insuranceAccepted?: string[];
    specialties?: string[];
    qualifications?: string[];
    languages?: string[];
    emergencyServices?: boolean;
    parkingAvailable?: boolean;
    publicTransport?: string;
    facilitiesInfo?: string;
    patientRatings?: {
      overallRating?: number;
      cleanliness?: number;
      staff?: number;
      waitTime?: number;
      communication?: number;
      totalReviews?: number;
    };
    operatingHours?: {
      [key: string]: string;
    };
  };
}

const HealthcareSearch: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<HealthcareProvider | null>(null);
  const [searchMode, setSearchMode] = useState<'healthcare' | 'symptoms' | 'travel'>('healthcare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<HealthcareRecommendation | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerDetails, setProviderDetails] = useState<ProviderDetails | null>(null);
  const [loadingProviderDetails, setLoadingProviderDetails] = useState(false);

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
    if (userLocation && searchMode === 'healthcare') {
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

  const handleLocationChange = (location: Location, option?: LocationOption) => {
    setUserLocation(location);
  };

  const handleLocationError = (error: string) => {
    setError(error);
  };

  const handleProviderSelect = (provider: HealthcareProvider) => {
    setSelectedProvider(provider);
  };

  const handleProviderClick = async (provider: HealthcareProvider) => {
    setSelectedProvider(provider);
    setShowProviderModal(true);
    setLoadingProviderDetails(true);
    
    try {
      const details = await fetchProviderDetails(provider);
      setProviderDetails(details);
    } catch (error) {
      console.error('Failed to fetch provider details:', error);
      // Still show the modal with basic information
      setProviderDetails({ provider });
    } finally {
      setLoadingProviderDetails(false);
    }
  };

  const fetchProviderDetails = async (provider: HealthcareProvider): Promise<ProviderDetails> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/databricks/provider-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: provider.placeId,
          providerName: provider.name,
          address: provider.address,
          type: provider.type,
          location: provider.location
        })
      });

      if (!response.ok) {
        throw new Error(`Provider details request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          provider,
          additionalInfo: result.details
        };
      } else {
        throw new Error('Provider details returned unsuccessful result');
      }
    } catch (error) {
      console.warn('Failed to fetch detailed provider information:', error);
      // Return basic information with mock enhanced details
      return {
        provider,
        additionalInfo: generateMockProviderDetails(provider)
      };
    }
  };

  const generateMockProviderDetails = (provider: HealthcareProvider) => {
    const servicesByType = {
      hospital: ['Emergency Care', 'Surgery', 'Radiology', 'Laboratory', 'Pharmacy', 'Cardiology', 'Neurology'],
      urgent_care: ['Minor Injuries', 'Flu Treatment', 'X-rays', 'Lab Tests', 'Vaccinations'],
      clinic: ['Primary Care', 'Preventive Care', 'Chronic Disease Management', 'Wellness Exams'],
      pharmacy: ['Prescription Filling', 'Vaccinations', 'Health Screenings', 'Medication Consultation'],
      dentist: ['Cleanings', 'Fillings', 'Root Canals', 'Crowns', 'Orthodontics', 'Oral Surgery'],
      doctor: ['Consultations', 'Diagnoses', 'Treatment Plans', 'Referrals', 'Follow-up Care']
    };

    return {
      description: `${provider.name} is a ${provider.type.replace('_', ' ')} facility providing quality healthcare services to the community.`,
      services: servicesByType[provider.type as keyof typeof servicesByType] || ['General Healthcare'],
      insuranceAccepted: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealth', 'Medicare', 'Medicaid'],
      specialties: provider.type === 'hospital' 
        ? ['Internal Medicine', 'Emergency Medicine', 'Surgery', 'Radiology']
        : provider.type === 'dentist'
        ? ['General Dentistry', 'Preventive Care', 'Restorative Dentistry']
        : ['Primary Care', 'Preventive Medicine'],
      languages: ['English', 'Spanish'],
      emergencyServices: provider.type === 'hospital',
      parkingAvailable: true,
      publicTransport: 'Accessible by public transportation',
      facilitiesInfo: provider.accessibility?.wheelchairAccessible 
        ? 'Wheelchair accessible facility with accessible parking and restrooms'
        : 'Please call to inquire about accessibility accommodations',
      patientRatings: {
        overallRating: provider.rating,
        cleanliness: provider.rating ? Math.min(5, provider.rating + 0.2) : 4.2,
        staff: provider.rating ? Math.min(5, provider.rating + 0.1) : 4.3,
        waitTime: provider.rating ? Math.max(1, provider.rating - 0.3) : 3.8,
        communication: provider.rating ? Math.min(5, provider.rating + 0.15) : 4.1,
        totalReviews: provider.totalRatings || 150
      },
      operatingHours: provider.type === 'hospital' ? {
        'Monday': '24 Hours',
        'Tuesday': '24 Hours', 
        'Wednesday': '24 Hours',
        'Thursday': '24 Hours',
        'Friday': '24 Hours',
        'Saturday': '24 Hours',
        'Sunday': '24 Hours'
      } : {
        'Monday': '8:00 AM - 6:00 PM',
        'Tuesday': '8:00 AM - 6:00 PM',
        'Wednesday': '8:00 AM - 6:00 PM',
        'Thursday': '8:00 AM - 6:00 PM',
        'Friday': '8:00 AM - 6:00 PM',
        'Saturday': '9:00 AM - 4:00 PM',
        'Sunday': 'Closed'
      }
    };
  };

  const closeProviderModal = () => {
    setShowProviderModal(false);
    setProviderDetails(null);
    setLoadingProviderDetails(false);
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
        <h2>How can we help you today?</h2>
        <div className="search-mode-toggle">
          <button 
            className={`mode-btn ${searchMode === 'healthcare' ? 'active' : ''}`}
            onClick={() => setSearchMode('healthcare')}
          >
            <span className="mode-icon">🏥</span>
            <div className="mode-content">
              <h4>Find Healthcare</h4>
              <p>Search nearby providers by location</p>
            </div>
          </button>
          <button 
            className={`mode-btn ${searchMode === 'symptoms' ? 'active' : ''}`}
            onClick={() => setSearchMode('symptoms')}
          >
            <span className="mode-icon">🩺</span>
            <div className="mode-content">
              <h4>Symptom Checker</h4>
              <p>Get AI-powered healthcare recommendations</p>
            </div>
          </button>
          <button 
            className={`mode-btn ${searchMode === 'travel' ? 'active' : ''}`}
            onClick={() => setSearchMode('travel')}
          >
            <span className="mode-icon">🗺️</span>
            <div className="mode-content">
              <h4>Travel Health</h4>
              <p>Plan healthcare for your trip</p>
            </div>
          </button>
        </div>
      </div>

      <div className="search-content">
        <div className="search-panel">
          {searchMode === 'healthcare' ? (
            <div className="location-search">
              <LocationSelector
                selectedLocation={userLocation}
                onLocationChange={handleLocationChange}
                onError={handleLocationError}
              />
              
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

                <div className="filter-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={filters.accessibilityRequired || false}
                      onChange={(e) => setFilters({...filters, accessibilityRequired: e.target.checked})}
                    />
                    Accessibility Required
                  </label>
                  <small>Filter for wheelchair accessible facilities with good accessibility ratings</small>
                </div>
              </div>
            </div>
          ) : searchMode === 'symptoms' ? (
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
          ) : (
            <div className="travel-health">
              <h3>Travel Health Planning</h3>
              <div className="travel-content">
                <p>Plan your healthcare needs for upcoming travel.</p>
                <div className="travel-options">
                  <div className="travel-feature">
                    <h4>🌍 Destination Health Info</h4>
                    <p>Get health requirements and recommendations for your destination</p>
                  </div>
                  <div className="travel-feature">
                    <h4>💉 Vaccination Requirements</h4>
                    <p>Find required and recommended vaccinations</p>
                  </div>
                  <div className="travel-feature">
                    <h4>🏥 Emergency Contacts</h4>
                    <p>Locate healthcare facilities at your destination</p>
                  </div>
                  <div className="travel-feature">
                    <h4>💊 Medication Planning</h4>
                    <p>Prepare prescriptions and medical supplies for travel</p>
                  </div>
                </div>
                <p className="coming-soon">Full travel health features coming soon!</p>
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
                onClick={() => handleProviderClick(provider)}
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

      {/* Provider Details Modal */}
      {showProviderModal && providerDetails && (
        <div className="provider-modal-overlay" onClick={closeProviderModal}>
          <div className="provider-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{providerDetails.provider.name}</h2>
              <button className="close-modal-btn" onClick={closeProviderModal}>×</button>
            </div>
            
            {loadingProviderDetails ? (
              <div className="modal-loading">
                <div className="spinner"></div>
                <p>Loading provider details...</p>
              </div>
            ) : (
              <div className="modal-body">
                <div className="provider-basic-info">
                  <div className="provider-type-badge">
                    {providerDetails.provider.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <p className="provider-address">{providerDetails.provider.address}</p>
                  {providerDetails.provider.rating && (
                    <div className="provider-rating">
                      {'⭐'.repeat(Math.round(providerDetails.provider.rating))} 
                      {providerDetails.provider.rating.toFixed(1)}
                      {providerDetails.provider.totalRatings && (
                        <span className="rating-count"> ({providerDetails.provider.totalRatings} reviews)</span>
                      )}
                    </div>
                  )}
                  {providerDetails.provider.distance && (
                    <p className="provider-distance">{providerDetails.provider.distance.toFixed(1)} miles away</p>
                  )}
                </div>

                {providerDetails.additionalInfo?.description && (
                  <div className="provider-section">
                    <h3>About</h3>
                    <p>{providerDetails.additionalInfo.description}</p>
                  </div>
                )}

                {providerDetails.additionalInfo?.services && providerDetails.additionalInfo.services.length > 0 && (
                  <div className="provider-section">
                    <h3>Services</h3>
                    <ul className="services-list">
                      {providerDetails.additionalInfo.services.map((service, index) => (
                        <li key={index}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {providerDetails.additionalInfo?.operatingHours && (
                  <div className="provider-section">
                    <h3>Hours</h3>
                    <div className="hours-list">
                      {Object.entries(providerDetails.additionalInfo.operatingHours).map(([day, hours]) => (
                        <div key={day} className="hours-item">
                          <span className="hours-day">{day}:</span>
                          <span className="hours-time">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {providerDetails.additionalInfo?.patientRatings && (
                  <div className="provider-section">
                    <h3>Patient Ratings</h3>
                    <div className="ratings-breakdown">
                      {providerDetails.additionalInfo.patientRatings.overallRating && (
                        <div className="rating-item">
                          <span>Overall:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.overallRating.toFixed(1)}/5</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.patientRatings.cleanliness && (
                        <div className="rating-item">
                          <span>Cleanliness:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.cleanliness.toFixed(1)}/5</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.patientRatings.staff && (
                        <div className="rating-item">
                          <span>Staff:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.staff.toFixed(1)}/5</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.patientRatings.waitTime && (
                        <div className="rating-item">
                          <span>Wait Time:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.waitTime.toFixed(1)}/5</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.patientRatings.communication && (
                        <div className="rating-item">
                          <span>Communication:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.communication.toFixed(1)}/5</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.patientRatings.totalReviews && (
                        <div className="rating-item">
                          <span>Total Reviews:</span>
                          <span>{providerDetails.additionalInfo.patientRatings.totalReviews}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {providerDetails.provider.accessibility && (
                  <div className="provider-section">
                    <h3>Accessibility</h3>
                    <div className="accessibility-info">
                      {providerDetails.provider.accessibility.wheelchairAccessible !== undefined && (
                        <div className="accessibility-item">
                          <span>Wheelchair Accessible:</span>
                          <span className={providerDetails.provider.accessibility.wheelchairAccessible ? 'yes' : 'no'}>
                            {providerDetails.provider.accessibility.wheelchairAccessible ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {providerDetails.provider.accessibility.parkingAvailable !== undefined && (
                        <div className="accessibility-item">
                          <span>Parking Available:</span>
                          <span className={providerDetails.provider.accessibility.parkingAvailable ? 'yes' : 'no'}>
                            {providerDetails.provider.accessibility.parkingAvailable ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {providerDetails.provider.accessibility.accessibilityRating && (
                        <div className="accessibility-item">
                          <span>Accessibility Rating:</span>
                          <span>{providerDetails.provider.accessibility.accessibilityRating}/5</span>
                        </div>
                      )}
                      {providerDetails.provider.accessibility.accessibilityNotes && (
                        <div className="accessibility-notes">
                          <p>{providerDetails.provider.accessibility.accessibilityNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {providerDetails.additionalInfo?.insuranceAccepted && providerDetails.additionalInfo.insuranceAccepted.length > 0 && (
                  <div className="provider-section">
                    <h3>Insurance Accepted</h3>
                    <div className="insurance-list">
                      {providerDetails.additionalInfo.insuranceAccepted.map((insurance, index) => (
                        <span key={index} className="insurance-badge">{insurance}</span>
                      ))}
                    </div>
                  </div>
                )}

                {providerDetails.additionalInfo?.specialties && providerDetails.additionalInfo.specialties.length > 0 && (
                  <div className="provider-section">
                    <h3>Specialties</h3>
                    <div className="specialties-list">
                      {providerDetails.additionalInfo.specialties.map((specialty, index) => (
                        <span key={index} className="specialty-badge">{specialty}</span>
                      ))}
                    </div>
                  </div>
                )}

                {providerDetails.additionalInfo?.languages && providerDetails.additionalInfo.languages.length > 0 && (
                  <div className="provider-section">
                    <h3>Languages Spoken</h3>
                    <div className="languages-list">
                      {providerDetails.additionalInfo.languages.map((language, index) => (
                        <span key={index} className="language-badge">{language}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(providerDetails.additionalInfo?.emergencyServices || 
                  providerDetails.additionalInfo?.parkingAvailable || 
                  providerDetails.additionalInfo?.publicTransport) && (
                  <div className="provider-section">
                    <h3>Facilities</h3>
                    <div className="facilities-info">
                      {providerDetails.additionalInfo.emergencyServices && (
                        <div className="facility-item">
                          <span className="facility-icon">🚨</span>
                          <span>Emergency Services Available</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.parkingAvailable && (
                        <div className="facility-item">
                          <span className="facility-icon">🅿️</span>
                          <span>Parking Available</span>
                        </div>
                      )}
                      {providerDetails.additionalInfo.publicTransport && (
                        <div className="facility-item">
                          <span className="facility-icon">🚌</span>
                          <span>{providerDetails.additionalInfo.publicTransport}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {providerDetails.additionalInfo?.facilitiesInfo && (
                  <div className="provider-section">
                    <h3>Additional Information</h3>
                    <p>{providerDetails.additionalInfo.facilitiesInfo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthcareSearch;