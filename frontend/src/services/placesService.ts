import { GOOGLE_MAPS_CONFIG } from '../config/google';
import { Location } from './locationService';

export interface HealthcareProvider {
  id: string;
  name: string;
  address: string;
  location: Location;
  type: ProviderType;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  phone?: string;
  website?: string;
  hours?: {
    isOpen: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  photos?: string[];
  distance?: number;
  placeId: string;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
}

export type ProviderType = 
  | 'hospital' 
  | 'urgent_care' 
  | 'clinic' 
  | 'pharmacy' 
  | 'dentist' 
  | 'veterinarian'
  | 'physiotherapist'
  | 'doctor'
  | 'health';

export interface SearchFilters {
  type?: ProviderType | 'all';
  radius?: number; // in meters
  minRating?: number;
  priceLevel?: number[];
  isOpen?: boolean;
  keyword?: string;
}

export interface PlaceDetails extends HealthcareProvider {
  reviews?: Array<{
    author: string;
    rating: number;
    text: string;
    time: number;
  }>;
  geometry?: {
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  utcOffset?: number;
  services?: string[];
  accessibility?: {
    wheelchairAccessible?: boolean;
  };
}

class PlacesService {
  private static instance: PlacesService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PlacesService {
    if (!PlacesService.instance) {
      PlacesService.instance = new PlacesService();
    }
    return PlacesService.instance;
  }

  /**
   * Initialize Google Places service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!window.google?.maps?.places) {
        // Load Google Maps script directly
        await this.loadGoogleMapsScript();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Places:', error);
      throw new Error('Google Places initialization failed');
    }
  }

  private async loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript && window.google?.maps?.places) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });
  }

  /**
   * Search for healthcare providers near a location
   */
  public async searchNearbyProviders(
    location: Location,
    filters: SearchFilters = {}
  ): Promise<HealthcareProvider[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      type = 'all',
      radius = 5000,
      minRating = 0,
      isOpen,
      keyword
    } = filters;

    // For now, let's use a simple approach with mock data since the new API may not be fully available
    // This provides immediate functionality while we work on full integration
    return this.getMockHealthcareProviders(location, type, radius);
  }

  private getMockHealthcareProviders(location: Location, type: ProviderType | 'all', radius: number): HealthcareProvider[] {
    const mockProviders: HealthcareProvider[] = [
      {
        id: 'mock-hospital-1',
        placeId: 'mock-hospital-1',
        name: 'City General Hospital',
        address: '123 Medical Center Dr, Downtown',
        location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
        type: 'hospital',
        rating: 4.2,
        totalRatings: 156,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat + 0.01, lng: location.lng + 0.01 })
      },
      {
        id: 'mock-urgent-1',
        placeId: 'mock-urgent-1',
        name: 'QuickCare Urgent Care',
        address: '456 Health St, Midtown',
        location: { lat: location.lat - 0.008, lng: location.lng + 0.012 },
        type: 'urgent_care',
        rating: 4.5,
        totalRatings: 89,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat - 0.008, lng: location.lng + 0.012 })
      },
      {
        id: 'mock-pharmacy-1',
        placeId: 'mock-pharmacy-1',
        name: 'MediPlex Pharmacy',
        address: '789 Wellness Ave, Uptown',
        location: { lat: location.lat + 0.015, lng: location.lng - 0.005 },
        type: 'pharmacy',
        rating: 4.8,
        totalRatings: 234,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat + 0.015, lng: location.lng - 0.005 })
      },
      {
        id: 'mock-clinic-1',
        placeId: 'mock-clinic-1',
        name: 'Family Health Clinic',
        address: '321 Care Blvd, Westside',
        location: { lat: location.lat - 0.012, lng: location.lng - 0.008 },
        type: 'clinic',
        rating: 4.3,
        totalRatings: 67,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat - 0.012, lng: location.lng - 0.008 })
      },
      {
        id: 'mock-dentist-1',
        placeId: 'mock-dentist-1',
        name: 'Smile Dental Care',
        address: '654 Tooth Lane, Eastside',
        location: { lat: location.lat + 0.006, lng: location.lng + 0.018 },
        type: 'dentist',
        rating: 4.7,
        totalRatings: 123,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat + 0.006, lng: location.lng + 0.018 })
      }
    ];

    // Filter by type if specified
    if (type !== 'all') {
      return mockProviders.filter(provider => provider.type === type);
    }

    return mockProviders;
  }

  /**
   * Search for healthcare providers by text query
   */
  public async searchByText(
    query: string,
    location?: Location,
    radius: number = 10000
  ): Promise<HealthcareProvider[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // For now, return filtered mock data based on query
    const mockProviders = this.getMockHealthcareProviders(location || { lat: 40.7128, lng: -74.0060 }, 'all', radius);
    
    // Simple text filtering
    const filteredProviders = mockProviders.filter(provider => 
      provider.name.toLowerCase().includes(query.toLowerCase()) ||
      provider.address.toLowerCase().includes(query.toLowerCase()) ||
      provider.type.toLowerCase().includes(query.toLowerCase())
    );

    return filteredProviders;
  }

  /**
   * Get detailed information about a specific place
   */
  public async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // For mock data, return enhanced details
    const mockProviders = this.getMockHealthcareProviders({ lat: 40.7128, lng: -74.0060 }, 'all', 10000);
    const provider = mockProviders.find(p => p.placeId === placeId);
    
    if (!provider) {
      throw new Error('Place not found');
    }

    const details: PlaceDetails = {
      ...provider,
      phone: '+1 (555) 123-4567',
      website: 'https://example.com',
      hours: {
        isOpen: true,
        periods: [
          {
            open: { day: 1, time: '0800' },
            close: { day: 1, time: '1700' }
          }
        ]
      }
    };

    return details;
  }

  /**
   * Find healthcare providers by specialty
   */
  public async findSpecialists(
    specialty: string,
    location: Location,
    radius: number = 10000
  ): Promise<HealthcareProvider[]> {
    const specialtyQueries = this.getSpecialtyQueries(specialty);
    const allResults: HealthcareProvider[] = [];

    for (const query of specialtyQueries) {
      try {
        const results = await this.searchByText(
          `${query} near ${location.address || `${location.lat},${location.lng}`}`,
          location,
          radius
        );
        allResults.push(...results);
      } catch (error) {
        console.warn(`Search failed for ${query}:`, error);
      }
    }

    // Remove duplicates based on place ID
    const uniqueResults = allResults.filter((provider, index, self) => 
      index === self.findIndex(p => p.placeId === provider.placeId)
    );

    return uniqueResults;
  }

  /**
   * Get provider photos
   */
  public getPhotoUrl(
    photoReference: string, 
    maxWidth: number = 400, 
    maxHeight?: number
  ): string {
    const params = new URLSearchParams({
      photoreference: photoReference,
      key: GOOGLE_MAPS_CONFIG.API_KEY,
      maxwidth: maxWidth.toString(),
      ...(maxHeight && { maxheight: maxHeight.toString() })
    });

    return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
  }


  private convertToHealthcareProvider(
    place: google.maps.places.PlaceResult,
    userLocation?: Location
  ): HealthcareProvider {
    const location: Location = {
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0
    };

    const provider: HealthcareProvider = {
      id: place.place_id || `place_${Date.now()}_${Math.random()}`,
      placeId: place.place_id || '',
      name: place.name || 'Unknown Provider',
      address: place.vicinity || place.formatted_address || 'Address not available',
      location,
      type: this.determineProviderType(place.types || []),
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      priceLevel: place.price_level,
      businessStatus: (place as any).business_status,
      ...(place.photos && place.photos.length > 0 && {
        photos: place.photos.slice(0, 5).map(photo => 
          this.getPhotoUrl((photo as any).photo_reference)
        )
      })
    };

    // Calculate distance if user location is provided
    if (userLocation) {
      provider.distance = this.calculateDistance(userLocation, location);
    }

    return provider;
  }


  private convertToPlaceDetails(place: google.maps.places.PlaceResult): PlaceDetails {
    const baseProvider = this.convertToHealthcareProvider(place);
    
    const details: PlaceDetails = {
      ...baseProvider,
      phone: place.formatted_phone_number,
      website: place.website,
      utcOffset: place.utc_offset_minutes,
      ...(place.opening_hours && {
        hours: {
          isOpen: place.opening_hours.isOpen?.() || false,
          periods: (place.opening_hours.periods || []).map(period => ({
            open: {
              day: period.open?.day || 0,
              time: period.open?.time || '0000'
            },
            close: {
              day: period.close?.day || 0,
              time: period.close?.time || '2359'
            }
          }))
        }
      }),
      ...(place.reviews && {
        reviews: place.reviews.map(review => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time
        }))
      }),
      ...(place.geometry?.viewport && {
        geometry: {
          viewport: {
            northeast: {
              lat: place.geometry.viewport.getNorthEast().lat(),
              lng: place.geometry.viewport.getNorthEast().lng()
            },
            southwest: {
              lat: place.geometry.viewport.getSouthWest().lat(),
              lng: place.geometry.viewport.getSouthWest().lng()
            }
          }
        }
      })
    };

    return details;
  }


  private getGooglePlaceType(type: ProviderType | 'all'): string {
    switch (type) {
      case 'hospital':
        return 'hospital';
      case 'pharmacy':
        return 'pharmacy';
      case 'dentist':
        return 'dentist';
      case 'veterinarian':
        return 'veterinary_care';
      case 'doctor':
      case 'clinic':
      case 'urgent_care':
        return 'doctor';
      case 'physiotherapist':
        return 'physiotherapist';
      default:
        return 'health';
    }
  }

  private determineProviderType(types: string[]): ProviderType {
    if (types.includes('hospital')) return 'hospital';
    if (types.includes('pharmacy')) return 'pharmacy';
    if (types.includes('dentist')) return 'dentist';
    if (types.includes('veterinary_care')) return 'veterinarian';
    if (types.includes('physiotherapist')) return 'physiotherapist';
    if (types.includes('doctor')) return 'doctor';
    if (types.includes('health')) return 'health';
    
    // Try to determine from name patterns
    const name = types.join(' ').toLowerCase();
    if (name.includes('urgent') || name.includes('emergency')) return 'urgent_care';
    if (name.includes('clinic')) return 'clinic';
    
    return 'health';
  }

  private getSpecialtyQueries(specialty: string): string[] {
    const specialtyMap: Record<string, string[]> = {
      'cardiology': ['cardiologist', 'heart doctor', 'cardiac specialist'],
      'dermatology': ['dermatologist', 'skin doctor'],
      'neurology': ['neurologist', 'brain doctor'],
      'orthopedics': ['orthopedist', 'bone doctor', 'sports medicine'],
      'psychiatry': ['psychiatrist', 'mental health'],
      'pediatrics': ['pediatrician', 'children doctor'],
      'gynecology': ['gynecologist', 'womens health'],
      'ophthalmology': ['eye doctor', 'ophthalmologist'],
      'urology': ['urologist'],
      'oncology': ['oncologist', 'cancer doctor'],
      'endocrinology': ['endocrinologist', 'diabetes doctor'],
      'gastroenterology': ['gastroenterologist', 'stomach doctor'],
      'nephrology': ['nephrologist', 'kidney doctor'],
      'pulmonology': ['pulmonologist', 'lung doctor'],
      'rheumatology': ['rheumatologist', 'arthritis doctor'],
      'allergy': ['allergist', 'allergy doctor'],
      'dialysis': ['dialysis center', 'kidney dialysis', 'hemodialysis'],
      'sti': ['sexual health clinic', 'std testing', 'reproductive health'],
      'covid': ['covid testing', 'coronavirus testing', 'urgent care']
    };

    const lowerSpecialty = specialty.toLowerCase();
    return specialtyMap[lowerSpecialty] || [specialty];
  }

  private calculateDistance(from: Location, to: Location): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default PlacesService.getInstance();