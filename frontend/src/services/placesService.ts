import { GOOGLE_MAPS_CONFIG } from '../config/google';
import { Location } from './locationService';
import DatabricksService from './databricksService';

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
  accessibility?: {
    wheelchairAccessible?: boolean;
    parkingAvailable?: boolean;
    publicTransportAccess?: boolean;
    entranceAccessible?: boolean;
    bathroomAccessible?: boolean;
    elevatorAccess?: boolean;
    accessibilityRating?: number; // 1-5 scale from AI assessment
    accessibilityNotes?: string;
  };
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
  accessibilityRequired?: boolean;
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
    parkingAvailable?: boolean;
    publicTransportAccess?: boolean;
    entranceAccessible?: boolean;
    bathroomAccessible?: boolean;
    elevatorAccess?: boolean;
    accessibilityRating?: number; // 1-5 scale from AI assessment
    accessibilityNotes?: string;
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
      keyword,
      accessibilityRequired
    } = filters;

    // Use Google Places API to find real healthcare providers
    let providers = await this.searchRealProviders(location, type, radius, minRating, isOpen, keyword);

    // If accessibility is required, filter and enhance with AI assessment
    if (accessibilityRequired) {
      providers = await this.filterByAccessibility(providers);
    }

    return providers;
  }

  /**
   * Search for healthcare providers using Google Places API
   */
  private async searchRealProviders(
    location: Location,
    type: ProviderType | 'all',
    radius: number,
    minRating: number = 0,
    isOpen?: boolean,
    keyword?: string
  ): Promise<HealthcareProvider[]> {
    if (!window.google?.maps?.places) {
      throw new Error('Google Places service not available');
    }

    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    const searchTypes = type === 'all' 
      ? ['hospital', 'pharmacy', 'doctor', 'dentist', 'health'] 
      : [this.getGooglePlaceType(type)];

    const allProviders: HealthcareProvider[] = [];

    for (const searchType of searchTypes) {
      try {
        const results = await this.performPlacesSearch(
          service, 
          location, 
          searchType, 
          radius, 
          keyword
        );

        const providers = results
          .filter(place => {
            if (minRating > 0 && (!place.rating || place.rating < minRating)) {
              return false;
            }
            if (isOpen && place.opening_hours && !place.opening_hours.isOpen?.()) {
              return false;
            }
            return true;
          })
          .map(place => this.convertToHealthcareProvider(place, location));

        allProviders.push(...providers);
      } catch (error) {
        console.warn(`Search failed for type ${searchType}:`, error);
      }
    }

    // Remove duplicates based on place ID
    const uniqueProviders = allProviders.filter((provider, index, self) => 
      index === self.findIndex(p => p.placeId === provider.placeId)
    );

    // Sort by distance if available, then by rating
    return uniqueProviders.sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      if (a.rating && b.rating) {
        return b.rating - a.rating;
      }
      return 0;
    });
  }

  /**
   * Perform Google Places nearby search
   */
  private performPlacesSearch(
    service: google.maps.places.PlacesService,
    location: Location,
    type: string,
    radius: number,
    keyword?: string
  ): Promise<google.maps.places.PlaceResult[]> {
    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: type as any,
        ...(keyword && { keyword })
      };

      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  private getMockHealthcareProviders(location: Location, type: ProviderType | 'all', radius: number): HealthcareProvider[] {
    // Extract city name from location for more realistic provider names
    const cityName = location.city || location.address?.split(',')[0] || 'Local';
    const state = location.state || location.address?.split(',')[1]?.trim() || '';
    const locationSuffix = state ? `, ${cityName}, ${state}` : `, ${cityName}`;
    
    const mockProviders: HealthcareProvider[] = [
      {
        id: 'mock-hospital-1',
        placeId: 'mock-hospital-1',
        name: `${cityName} General Hospital`,
        address: `123 Medical Center Dr${locationSuffix}`,
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
        name: `${cityName} QuickCare Urgent Care`,
        address: `456 Health St${locationSuffix}`,
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
        name: `${cityName} Pharmacy`,
        address: `789 Wellness Ave${locationSuffix}`,
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
        name: `${cityName} Family Health Clinic`,
        address: `321 Care Blvd${locationSuffix}`,
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
        name: `${cityName} Dental Care`,
        address: `654 Dental Way${locationSuffix}`,
        location: { lat: location.lat + 0.006, lng: location.lng + 0.018 },
        type: 'dentist',
        rating: 4.7,
        totalRatings: 123,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat + 0.006, lng: location.lng + 0.018 })
      },
      {
        id: 'mock-clinic-2',
        placeId: 'mock-clinic-2',
        name: `${cityName} Walk-In Clinic`,
        address: `888 Main St${locationSuffix}`,
        location: { lat: location.lat - 0.005, lng: location.lng + 0.008 },
        type: 'clinic',
        rating: 4.1,
        totalRatings: 92,
        businessStatus: 'OPERATIONAL',
        distance: this.calculateDistance(location, { lat: location.lat - 0.005, lng: location.lng + 0.008 })
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

  /**
   * Filter providers by accessibility requirements using Databricks AI
   */
  private async filterByAccessibility(providers: HealthcareProvider[]): Promise<HealthcareProvider[]> {
    const accessibleProviders: HealthcareProvider[] = [];

    for (const provider of providers) {
      try {
        const accessibilityInfo = await this.assessAccessibilityWithAI(provider);
        
        // Only include providers with good accessibility rating (4+ out of 5)
        if (accessibilityInfo.accessibilityRating && accessibilityInfo.accessibilityRating >= 4) {
          accessibleProviders.push({
            ...provider,
            accessibility: accessibilityInfo
          });
        }
      } catch (error) {
        console.warn(`Failed to assess accessibility for ${provider.name}:`, error);
        // Include provider with default accessibility info if AI assessment fails
        accessibleProviders.push({
          ...provider,
          accessibility: {
            wheelchairAccessible: false,
            accessibilityRating: 3,
            accessibilityNotes: 'Accessibility information unavailable - please call to verify'
          }
        });
      }
    }

    return accessibleProviders;
  }

  /**
   * Use Databricks AI to assess accessibility of a healthcare provider
   */
  private async assessAccessibilityWithAI(provider: HealthcareProvider): Promise<{
    wheelchairAccessible?: boolean;
    parkingAvailable?: boolean;
    publicTransportAccess?: boolean;
    entranceAccessible?: boolean;
    bathroomAccessible?: boolean;
    elevatorAccess?: boolean;
    accessibilityRating?: number;
    accessibilityNotes?: string;
  }> {
    try {
      const prompt = `
Assess the accessibility of this healthcare facility:

Facility Name: ${provider.name}
Type: ${provider.type}
Address: ${provider.address}
Rating: ${provider.rating || 'Not available'}

Based on the facility type, location, and name, provide an accessibility assessment including:
- Wheelchair accessibility
- Parking availability
- Public transport access
- Entrance accessibility
- Bathroom accessibility
- Elevator access (if multi-story)
- Overall accessibility rating (1-5 scale)
- Accessibility notes with specific details

Respond in JSON format:
{
  "wheelchairAccessible": true/false,
  "parkingAvailable": true/false,
  "publicTransportAccess": true/false,
  "entranceAccessible": true/false,
  "bathroomAccessible": true/false,
  "elevatorAccess": true/false,
  "accessibilityRating": 4,
  "accessibilityNotes": "Detailed accessibility information..."
}

Consider factors like:
- Hospital/large facilities typically have better accessibility
- Newer facilities usually comply with ADA standards
- Urban locations often have better public transport
- Chain facilities (CVS, Walgreens) typically have standardized accessibility
`;

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/databricks/accessibility-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          provider: {
            name: provider.name,
            type: provider.type,
            address: provider.address,
            rating: provider.rating
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse JSON response from AI
      let accessibilityData;
      try {
        // Extract JSON from response if it's wrapped in text
        const jsonMatch = result.response?.match(/\{[\s\S]*\}/) || result.match(/\{[\s\S]*\}/);
        accessibilityData = jsonMatch ? JSON.parse(jsonMatch[0]) : result;
      } catch (parseError) {
        console.warn('Failed to parse AI response, using fallback');
        accessibilityData = this.getFallbackAccessibilityData(provider);
      }

      return accessibilityData;
    } catch (error) {
      console.warn('AI accessibility assessment failed, using fallback:', error);
      return this.getFallbackAccessibilityData(provider);
    }
  }

  /**
   * Provide fallback accessibility data when AI assessment fails
   */
  private getFallbackAccessibilityData(provider: HealthcareProvider): {
    wheelchairAccessible?: boolean;
    parkingAvailable?: boolean;
    publicTransportAccess?: boolean;
    entranceAccessible?: boolean;
    bathroomAccessible?: boolean;
    elevatorAccess?: boolean;
    accessibilityRating?: number;
    accessibilityNotes?: string;
  } {
    // Basic heuristics for accessibility based on provider type
    const isLargeFacility = ['hospital', 'urgent_care'].includes(provider.type);
    const isChainPharmacy = provider.name.toLowerCase().includes('cvs') || 
                           provider.name.toLowerCase().includes('walgreens') ||
                           provider.name.toLowerCase().includes('rite aid');

    return {
      wheelchairAccessible: isLargeFacility || isChainPharmacy,
      parkingAvailable: isLargeFacility,
      publicTransportAccess: undefined, // Cannot determine without location analysis
      entranceAccessible: isLargeFacility || isChainPharmacy,
      bathroomAccessible: isLargeFacility,
      elevatorAccess: isLargeFacility,
      accessibilityRating: isLargeFacility ? 4 : (isChainPharmacy ? 3 : 2),
      accessibilityNotes: isLargeFacility 
        ? 'Large healthcare facility - typically ADA compliant with good accessibility features'
        : isChainPharmacy 
        ? 'Chain pharmacy - usually wheelchair accessible with basic accommodations'
        : 'Smaller facility - accessibility may vary. Please call ahead to verify accommodations.'
    };
  }
}

export default PlacesService.getInstance();