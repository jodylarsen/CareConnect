import { GOOGLE_MAPS_CONFIG } from '../config/google';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

class LocationService {
  private static instance: LocationService;
  private geocoder: google.maps.Geocoder | null = null;
  private watchId: number | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Initialize Google Maps services
   */
  public async initialize(): Promise<void> {
    try {
      if (!window.google?.maps) {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_CONFIG.API_KEY,
          version: GOOGLE_MAPS_CONFIG.VERSION,
          libraries: ['places', 'geometry']
        });
        
        await loader.load();
      }
      
      this.geocoder = new google.maps.Geocoder();
    } catch (error) {
      console.error('Failed to initialize Google Maps:', error);
      throw new Error('Google Maps initialization failed');
    }
  }

  /**
   * Get current user location using browser geolocation
   */
  public async getCurrentLocation(options?: PositionOptions): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: -1,
          message: 'Geolocation is not supported by this browser',
          type: 'UNKNOWN'
        } as LocationError);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          try {
            // Enhance with reverse geocoding
            const enhancedLocation = await this.reverseGeocode(location);
            resolve(enhancedLocation);
          } catch {
            // Return basic location if reverse geocoding fails
            resolve(location);
          }
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: this.getGeolocationErrorMessage(error.code),
            type: this.getGeolocationErrorType(error.code)
          };
          reject(locationError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Watch user location for continuous updates
   */
  public watchLocation(
    callback: (location: Location) => void,
    errorCallback?: (error: LocationError) => void,
    options?: PositionOptions
  ): number {
    if (!navigator.geolocation) {
      const error: LocationError = {
        code: -1,
        message: 'Geolocation is not supported by this browser',
        type: 'UNKNOWN'
      };
      errorCallback?.(error);
      return -1;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute for watch
      ...options
    };

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          const enhancedLocation = await this.reverseGeocode(location);
          callback(enhancedLocation);
        } catch {
          callback(location);
        }
      },
      (error) => {
        const locationError: LocationError = {
          code: error.code,
          message: this.getGeolocationErrorMessage(error.code),
          type: this.getGeolocationErrorType(error.code)
        };
        errorCallback?.(locationError);
      },
      defaultOptions
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   */
  public stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  public async reverseGeocode(location: Location): Promise<Location> {
    if (!this.geocoder) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error('Geocoder not initialized'));
        return;
      }

      const latLng = new google.maps.LatLng(location.lat, location.lng);

      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const enhancedLocation: Location = {
            ...location,
            address: result.formatted_address
          };

          // Extract address components
          result.address_components.forEach(component => {
            const types = component.types;
            
            if (types.includes('locality')) {
              enhancedLocation.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              enhancedLocation.state = component.short_name;
            } else if (types.includes('country')) {
              enhancedLocation.country = component.short_name;
            } else if (types.includes('postal_code')) {
              enhancedLocation.zipCode = component.long_name;
            }
          });

          resolve(enhancedLocation);
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Forward geocode address to coordinates
   */
  public async forwardGeocode(address: string): Promise<Location[]> {
    if (!this.geocoder) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error('Geocoder not initialized'));
        return;
      }

      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results) {
          const locations: Location[] = results.map(result => {
            const location: Location = {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              address: result.formatted_address
            };

            // Extract address components
            result.address_components.forEach(component => {
              const types = component.types;
              
              if (types.includes('locality')) {
                location.city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                location.state = component.short_name;
              } else if (types.includes('country')) {
                location.country = component.short_name;
              } else if (types.includes('postal_code')) {
                location.zipCode = component.long_name;
              }
            });

            return location;
          });

          resolve(locations);
        } else {
          reject(new Error(`Forward geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Calculate distance between two locations
   */
  public calculateDistance(from: Location, to: Location, unit: 'miles' | 'kilometers' = 'miles'): number {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get location from IP address (fallback method)
   */
  public async getLocationFromIP(): Promise<Location> {
    try {
      const response = await fetch('http://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city,
          state: data.region_code,
          country: data.country_code,
          zipCode: data.postal
        };
      }
      
      throw new Error('Invalid IP geolocation response');
    } catch (error) {
      console.error('IP geolocation failed:', error);
      throw new Error('Failed to get location from IP');
    }
  }

  /**
   * Check if location permissions are granted
   */
  public async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      return 'prompt'; // Assume prompt if Permissions API not available
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch {
      return 'prompt';
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getGeolocationErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access denied by user';
      case 2:
        return 'Location information unavailable';
      case 3:
        return 'Location request timed out';
      default:
        return 'Unknown location error';
    }
  }

  private getGeolocationErrorType(code: number): LocationError['type'] {
    switch (code) {
      case 1:
        return 'PERMISSION_DENIED';
      case 2:
        return 'POSITION_UNAVAILABLE';
      case 3:
        return 'TIMEOUT';
      default:
        return 'UNKNOWN';
    }
  }
}

export default LocationService.getInstance();