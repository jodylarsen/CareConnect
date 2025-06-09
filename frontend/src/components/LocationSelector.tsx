import React, { useState, useEffect } from 'react';
import { Location } from '../services/locationService';
import LocationService from '../services/locationService';
import AuthService from '../services/auth';
import './LocationSelector.css';

export interface LocationOption {
  type: 'current' | 'home' | 'work' | 'custom';
  label: string;
  location?: Location;
  address?: string;
}

interface LocationSelectorProps {
  selectedLocation: Location | null;
  onLocationChange: (location: Location, option: LocationOption) => void;
  onError: (error: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationChange,
  onError
}) => {
  const [selectedOption, setSelectedOption] = useState<'current' | 'home' | 'work' | 'custom'>('current');
  const [customSearch, setCustomSearch] = useState('');
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationOption[]>([]);

  useEffect(() => {
    initializeLocationOptions();
  }, []);

  useEffect(() => {
    if (selectedOption === 'current') {
      getCurrentLocation();
    }
  }, [selectedOption]);

  const initializeLocationOptions = async () => {
    const options: LocationOption[] = [
      {
        type: 'current',
        label: '📍 Current Location (Auto-detect)',
        location: undefined
      }
    ];

    // Try to get home and work locations from Google Maps profile
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const profileLocations = await getProfileLocations();
        options.push(...profileLocations);
      }
    } catch (error) {
      console.warn('Could not fetch profile locations:', error);
    }

    options.push({
      type: 'custom',
      label: '🔍 Search for a city',
      location: undefined
    });

    setLocationOptions(options);
  };

  const getProfileLocations = async (): Promise<LocationOption[]> => {
    // This would integrate with Google Maps profile data
    // For now, we'll use placeholder data that could be stored in user preferences
    const profileLocations: LocationOption[] = [];

    // Try to get saved home/work locations from localStorage or user profile
    const savedHome = localStorage.getItem('user_home_location');
    const savedWork = localStorage.getItem('user_work_location');

    if (savedHome) {
      try {
        const homeData = JSON.parse(savedHome);
        profileLocations.push({
          type: 'home',
          label: '🏠 Home',
          location: homeData.location,
          address: homeData.address
        });
      } catch (error) {
        console.warn('Invalid home location data');
      }
    }

    if (savedWork) {
      try {
        const workData = JSON.parse(savedWork);
        profileLocations.push({
          type: 'work',
          label: '🏢 Work',
          location: workData.location,
          address: workData.address
        });
      } catch (error) {
        console.warn('Invalid work location data');
      }
    }

    return profileLocations;
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      const option: LocationOption = {
        type: 'current',
        label: '📍 Current Location',
        location,
        address: 'Auto-detected location'
      };
      onLocationChange(location, option);
    } catch (error: any) {
      try {
        // Fallback to IP-based location
        const ipLocation = await LocationService.getLocationFromIP();
        const option: LocationOption = {
          type: 'current',
          label: '📍 Approximate Location',
          location: ipLocation,
          address: 'IP-based location (approximate)'
        };
        onLocationChange(ipLocation, option);
        onError('Using approximate location based on IP address.');
      } catch {
        onError('Unable to determine your current location. Please search for a city.');
      }
    } finally {
      setLoading(false);
    }
  };

  const searchForLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Use Google Places Autocomplete API for city search
      const results = await searchCities(query);
      setSearchResults(results);
    } catch (error) {
      onError('Failed to search for locations. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchCities = async (query: string): Promise<LocationOption[]> => {
    return new Promise((resolve) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        resolve([]);
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        {
          input: query,
          types: ['(cities)'],
          componentRestrictions: { country: 'US' } // Restrict to US cities
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const results: LocationOption[] = predictions.slice(0, 5).map(prediction => ({
              type: 'custom',
              label: prediction.description,
              address: prediction.description,
              location: undefined // Will be geocoded when selected
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        }
      );
    });
  };

  const geocodeAddress = async (address: string): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        reject(new Error('Google Maps not loaded'));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          reject(new Error('Failed to geocode address'));
        }
      });
    });
  };

  const handleOptionSelect = async (option: LocationOption) => {
    setSelectedOption(option.type);
    
    // For custom search results, fill the input field and close dropdown
    if (option.type === 'custom' && option.address) {
      setCustomSearch(option.address);
      setSearchResults([]);
    }
    
    if (option.location) {
      onLocationChange(option.location, option);
    } else if (option.address && option.type === 'custom') {
      setLoading(true);
      try {
        const location = await geocodeAddress(option.address);
        const updatedOption = { ...option, location };
        onLocationChange(location, updatedOption);
      } catch (error) {
        onError('Failed to find coordinates for the selected location.');
      } finally {
        setLoading(false);
      }
    }
  };

  const saveLocationAsPreference = async (type: 'home' | 'work', location: Location, address: string) => {
    const data = { location, address };
    localStorage.setItem(`user_${type}_location`, JSON.stringify(data));
    
    // Refresh location options to include the new saved location
    await initializeLocationOptions();
  };

  return (
    <div className="location-selector">
      <div className="location-header">
        <h3>📍 Select Location</h3>
        <p>Choose where to search for healthcare providers</p>
      </div>

      <div className="location-options">
        {locationOptions.map((option, index) => (
          <div key={index} className="location-option-group">
            {option.type !== 'custom' ? (
              <button
                className={`location-option ${selectedOption === option.type ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={loading}
              >
                <span className="option-label">{option.label}</span>
                {option.address && (
                  <span className="option-address">{option.address}</span>
                )}
              </button>
            ) : (
              <div className="custom-search-section">
                <label className="custom-search-label">🔍 Search for a city</label>
                <input
                  type="text"
                  className="custom-search-input"
                  placeholder="Enter city and state (e.g., 'Austin, TX')"
                  value={customSearch}
                  onChange={(e) => {
                    setCustomSearch(e.target.value);
                    searchForLocation(e.target.value);
                  }}
                  onFocus={() => setSelectedOption('custom')}
                />
                
                {searchResults.length > 0 && selectedOption === 'custom' && (
                  <div className="search-results">
                    {searchResults.map((result, resultIndex) => (
                      <button
                        key={resultIndex}
                        className="search-result-option"
                        onClick={() => handleOptionSelect(result)}
                      >
                        {result.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedLocation && selectedOption === 'custom' && (
        <div className="save-location-section">
          <p className="save-location-label">Save this location for future use:</p>
          <div className="save-buttons">
            <button
              className="save-home-btn"
              onClick={() => saveLocationAsPreference('home', selectedLocation, customSearch)}
            >
              💾 Save as Home
            </button>
            <button
              className="save-work-btn"
              onClick={() => saveLocationAsPreference('work', selectedLocation, customSearch)}
            >
              💾 Save as Work
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="location-loading">
          <span>🔄 Loading location...</span>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;