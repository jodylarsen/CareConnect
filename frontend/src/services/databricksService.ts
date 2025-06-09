import { Location } from './locationService';
import { HealthcareProvider } from './placesService';

export interface SymptomRequest {
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  duration: string;
  description: string;
  location: Location;
  userProfile?: {
    age?: number;
    gender?: string;
    medicalHistory?: string[];
    allergies?: string[];
    medications?: string[];
    chronicConditions?: string[];
  };
}

export interface HealthcareRecommendation {
  recommendedCareType: 'emergency' | 'hospital' | 'urgent_care' | 'clinic' | 'pharmacy' | 'telehealth' | 'home_care';
  urgency: 'emergency' | 'urgent' | 'moderate' | 'routine';
  confidence: number; // 0-1 scale
  reasoning: string;
  recommendations: string[];
  symptoms_analysis: {
    primary_symptoms: string[];
    severity_assessment: string;
    potential_conditions: string[];
    red_flags: string[];
  };
  next_steps: string[];
  when_to_seek_emergency_care: string[];
  estimated_wait_time?: string;
  cost_considerations?: string;
}

export interface DatabricksConfig {
  token: string;
  workspace: string;
  agentEndpoint: string;
}

class DatabricksService {
  private static instance: DatabricksService;
  private config: DatabricksConfig;
  private baseUrl: string;

  private constructor() {
    this.config = {
      token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
      workspace: process.env.REACT_APP_DATABRICKS_WORKSPACE || '',
      agentEndpoint: process.env.REACT_APP_DATABRICKS_AGENT_ENDPOINT || ''
    };
    
    // Always use backend API endpoints - no more direct browser calls
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
  }

  public static getInstance(): DatabricksService {
    if (!DatabricksService.instance) {
      DatabricksService.instance = new DatabricksService();
    }
    return DatabricksService.instance;
  }

  /**
   * Test connection to Databricks endpoint
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection via backend API:', `${this.baseUrl}/databricks/test`);
      
      const response = await fetch(`${this.baseUrl}/databricks/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      console.log('Connection test response:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Backend API error');
      }
      
      console.log('Connection test result:', result.success ? 'SUCCESS' : 'FAILED');
      return result.success && result.connected;
    } catch (error: any) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Analyze symptoms and get healthcare recommendations
   */
  public async analyzeSymptoms(request: SymptomRequest): Promise<HealthcareRecommendation> {
    try {
      console.log('Analyzing symptoms via backend API:', request.symptoms);
      
      const response = await fetch(`${this.baseUrl}/databricks/analyze-symptoms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });
      
      const result = await response.json();
      console.log('Symptom analysis response received');
      
      if (!response.ok) {
        throw new Error(result.message || 'Backend API error');
      }
      
      return result;
    } catch (error: any) {
      console.error('Symptom analysis failed:', error);
      
      // Fallback to local rule-based recommendation
      console.warn('Using local fallback recommendation');
      return this.createFallbackRecommendationFromSymptoms(request);
    }
  }

  /**
   * Get healthcare provider recommendations based on condition/specialty
   */
  public async getProviderRecommendations(
    condition: string,
    location: Location,
    urgency: 'emergency' | 'urgent' | 'routine' = 'routine'
  ): Promise<{
    recommended_types: string[];
    search_keywords: string[];
    urgency_level: string;
    additional_info: string;
  }> {
    try {
      const prompt = `
Based on the medical condition "${condition}" and urgency level "${urgency}", recommend:
1. Most appropriate healthcare provider types
2. Search keywords for finding providers
3. Any specific considerations

Location: ${location.city}, ${location.state}

Respond in JSON format:
{
  "recommended_types": ["hospital", "urgent_care", "clinic", "specialist"],
  "search_keywords": ["cardiology", "emergency", "urgent care"],
  "urgency_level": "urgent",
  "additional_info": "Patient should seek immediate care..."
}
`;

      const response = await this.makeRequest({
        messages: [
          {
            role: 'system',
            content: 'You are a healthcare navigation AI that helps patients find appropriate care providers based on their condition and location.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      });

      return this.parseProviderRecommendations(response);
    } catch (error) {
      console.error('Provider recommendations failed:', error);
      throw new Error(`Failed to get provider recommendations: ${error}`);
    }
  }

  /**
   * Get travel health recommendations
   */
  public async getTravelHealthAdvice(
    destination: string,
    healthConditions: string[],
    travelDuration: string
  ): Promise<{
    vaccinations: string[];
    medications: string[];
    healthcare_facilities: string[];
    travel_tips: string[];
    emergency_contacts: string[];
  }> {
    try {
      const prompt = `
Provide travel health advice for:
- Destination: ${destination}
- Health conditions: ${healthConditions.join(', ')}
- Travel duration: ${travelDuration}

Include vaccinations, medications, healthcare facilities to research, and travel tips.

Respond in JSON format with arrays for each category.
`;

      const response = await this.makeRequest({
        messages: [
          {
            role: 'system',
            content: 'You are a travel medicine specialist AI providing health advice for international travelers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return this.parseTravelHealthResponse(response);
    } catch (error) {
      console.error('Travel health advice failed:', error);
      throw new Error(`Failed to get travel health advice: ${error}`);
    }
  }

  /**
   * Make authenticated request to Databricks endpoint
   */
  private async makeRequest(payload: any): Promise<any> {
    if (!this.config.token || !this.config.workspace) {
      throw new Error('Databricks configuration is incomplete. Check environment variables.');
    }

    console.log('Making request to URL:', this.baseUrl);
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    console.log('Token length:', this.config.token.length);
    console.log('Token starts with:', this.config.token.substring(0, 10) + '...');
    console.log('Authorization header:', `Bearer ${this.config.token.substring(0, 10)}...`);

    const headers = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };

    console.log('Request headers:', headers);

    try {
      // Direct request to backend API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'cors'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        // Try to parse error response as JSON for better error handling
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message && errorJson.message.includes('get_weather')) {
            throw new Error(`Databricks agent function error: ${errorJson.message}`);
          }
          throw new Error(`Databricks API error (${response.status}): ${errorJson.message || errorText}`);
        } catch (parseError) {
          throw new Error(`Databricks API error (${response.status}): ${errorText}`);
        }
      }

      const jsonResponse = await response.json();
      console.log('Success response:', jsonResponse);
      return jsonResponse;
    } catch (fetchError: any) {
      console.error('Fetch error details:', fetchError);
      
      // Handle CORS and network errors
      if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
        throw new Error('CORS Error: Cannot access Databricks endpoint from browser. This is expected in development. The endpoint works (verified with curl) but browsers block cross-origin requests without proper CORS headers.');
      }
      
      throw fetchError;
    }
  }

  /**
   * Build detailed prompt for symptom analysis
   */
  private buildSymptomAnalysisPrompt(request: SymptomRequest): string {
    const { symptoms, severity, duration, description, location, userProfile } = request;

    return `
Analyze these symptoms and provide healthcare recommendations:

SYMPTOMS: ${symptoms.join(', ')}
SEVERITY: ${severity}
DURATION: ${duration}
DESCRIPTION: ${description}

PATIENT CONTEXT:
- Location: ${location.city || 'Unknown'}, ${location.state || 'Unknown'}
- Age: ${userProfile?.age || 'Not specified'}
- Gender: ${userProfile?.gender || 'Not specified'}
- Medical History: ${userProfile?.medicalHistory?.join(', ') || 'None provided'}
- Chronic Conditions: ${userProfile?.chronicConditions?.join(', ') || 'None provided'}
- Current Medications: ${userProfile?.medications?.join(', ') || 'None provided'}
- Allergies: ${userProfile?.allergies?.join(', ') || 'None provided'}

Please provide a detailed analysis in the following JSON format:
{
  "recommendedCareType": "emergency|hospital|urgent_care|clinic|pharmacy|telehealth|home_care",
  "urgency": "emergency|urgent|moderate|routine",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of the recommendation",
  "recommendations": ["Specific action items for the patient"],
  "symptoms_analysis": {
    "primary_symptoms": ["key symptoms"],
    "severity_assessment": "assessment details",
    "potential_conditions": ["possible conditions"],
    "red_flags": ["warning signs if any"]
  },
  "next_steps": ["immediate actions to take"],
  "when_to_seek_emergency_care": ["specific emergency warning signs"],
  "estimated_wait_time": "15-30 minutes",
  "cost_considerations": "Information about expected costs"
}

IMPORTANT: Always err on the side of caution. If there are any concerning symptoms, recommend higher-level care.
`;
  }

  /**
   * Parse healthcare response from Databricks
   */
  private parseHealthcareResponse(response: any): HealthcareRecommendation {
    try {
      // Extract content from Databricks response format
      let content = '';
      if (response.messages && response.messages[0] && response.messages[0].content) {
        // Databricks format: messages array
        content = response.messages[0].content;
      } else if (response.choices && response.choices[0] && response.choices[0].message) {
        // OpenAI format: choices array
        content = response.choices[0].message.content;
      } else if (response.response) {
        // Direct response
        content = response.response;
      } else {
        throw new Error('Unexpected response format from Databricks');
      }

      // Try to parse JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate required fields and provide defaults
        return {
          recommendedCareType: parsed.recommendedCareType || 'clinic',
          urgency: parsed.urgency || 'moderate',
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || 'Analysis completed',
          recommendations: parsed.recommendations || ['Consult with a healthcare provider'],
          symptoms_analysis: parsed.symptoms_analysis || {
            primary_symptoms: [],
            severity_assessment: 'Requires evaluation',
            potential_conditions: [],
            red_flags: []
          },
          next_steps: parsed.next_steps || ['Schedule an appointment'],
          when_to_seek_emergency_care: parsed.when_to_seek_emergency_care || ['Severe symptoms develop'],
          estimated_wait_time: parsed.estimated_wait_time,
          cost_considerations: parsed.cost_considerations
        };
      } else {
        // Fallback for non-JSON responses
        return this.createFallbackRecommendation(content);
      }
    } catch (error) {
      console.error('Failed to parse healthcare response:', error);
      throw new Error('Invalid response format from healthcare AI');
    }
  }

  /**
   * Parse provider recommendations response
   */
  private parseProviderRecommendations(response: any): any {
    try {
      let content = '';
      if (response.messages && response.messages[0] && response.messages[0].content) {
        content = response.messages[0].content;
      } else if (response.choices && response.choices[0] && response.choices[0].message) {
        content = response.choices[0].message.content;
      } else if (response.response) {
        content = response.response;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        recommended_types: ['clinic'],
        search_keywords: ['healthcare'],
        urgency_level: 'routine',
        additional_info: 'Consult with a healthcare provider'
      };
    } catch (error) {
      console.error('Failed to parse provider recommendations:', error);
      throw error;
    }
  }

  /**
   * Parse travel health response
   */
  private parseTravelHealthResponse(response: any): any {
    try {
      let content = '';
      if (response.messages && response.messages[0] && response.messages[0].content) {
        content = response.messages[0].content;
      } else if (response.choices && response.choices[0] && response.choices[0].message) {
        content = response.choices[0].message.content;
      } else if (response.response) {
        content = response.response;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        vaccinations: [],
        medications: [],
        healthcare_facilities: [],
        travel_tips: ['Consult with a travel medicine specialist'],
        emergency_contacts: []
      };
    } catch (error) {
      console.error('Failed to parse travel health response:', error);
      throw error;
    }
  }

  /**
   * Create fallback recommendation for non-JSON responses
   */
  private createFallbackRecommendation(content: string): HealthcareRecommendation {
    // Analyze content for urgency keywords
    const urgentKeywords = ['emergency', 'urgent', 'immediate', 'serious', 'severe'];
    const isUrgent = urgentKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );

    return {
      recommendedCareType: isUrgent ? 'urgent_care' : 'clinic',
      urgency: isUrgent ? 'urgent' : 'moderate',
      confidence: 0.6,
      reasoning: 'AI analysis completed. Recommendation based on symptom assessment.',
      recommendations: [content || 'Consult with a healthcare provider for proper evaluation'],
      symptoms_analysis: {
        primary_symptoms: [],
        severity_assessment: 'Requires professional evaluation',
        potential_conditions: [],
        red_flags: []
      },
      next_steps: ['Schedule an appointment with an appropriate healthcare provider'],
      when_to_seek_emergency_care: ['If symptoms worsen significantly', 'If you experience severe pain or difficulty breathing'],
      estimated_wait_time: isUrgent ? '30-60 minutes' : '1-2 hours',
      cost_considerations: 'Varies by provider and insurance coverage'
    };
  }

  /**
   * Create intelligent fallback recommendation based on symptoms when Databricks agent fails
   */
  private createFallbackRecommendationFromSymptoms(request: SymptomRequest): HealthcareRecommendation {
    const { symptoms, severity, duration } = request;
    
    // Determine urgency based on symptoms and severity
    const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe headache', 'confusion', 'loss of consciousness'];
    const urgentSymptoms = ['high fever', 'persistent vomiting', 'severe pain', 'shortness of breath'];
    
    const hasEmergencySymptom = symptoms.some(s => 
      emergencySymptoms.some(es => s.toLowerCase().includes(es.toLowerCase()))
    );
    const hasUrgentSymptom = symptoms.some(s => 
      urgentSymptoms.some(us => s.toLowerCase().includes(us.toLowerCase()))
    );
    
    let recommendedCareType: 'emergency' | 'hospital' | 'urgent_care' | 'clinic' | 'pharmacy' | 'telehealth' | 'home_care';
    let urgency: 'emergency' | 'urgent' | 'moderate' | 'routine';
    let confidence: number;
    
    if (hasEmergencySymptom || severity === 'emergency') {
      recommendedCareType = 'emergency';
      urgency = 'emergency';
      confidence = 0.9;
    } else if (hasUrgentSymptom || severity === 'severe') {
      recommendedCareType = 'urgent_care';
      urgency = 'urgent';
      confidence = 0.85;
    } else if (severity === 'moderate') {
      recommendedCareType = 'clinic';
      urgency = 'moderate';
      confidence = 0.75;
    } else {
      recommendedCareType = 'telehealth';
      urgency = 'routine';
      confidence = 0.7;
    }
    
    // Generate reasoning
    const reasoningParts = [
      `Based on reported symptoms: ${symptoms.join(', ')}`,
      `Severity level: ${severity}`,
      `Duration: ${duration}`,
      'Recommendation generated using rule-based fallback due to AI service limitations.'
    ];
    
    return {
      recommendedCareType,
      urgency,
      confidence,
      reasoning: reasoningParts.join('. '),
      recommendations: [
        `Seek ${recommendedCareType.replace('_', ' ')} for your symptoms`,
        'Monitor symptoms closely',
        'Keep a record of any changes in symptoms'
      ],
      symptoms_analysis: {
        primary_symptoms: symptoms,
        severity_assessment: `${severity} severity reported by patient`,
        potential_conditions: ['Multiple conditions possible - professional evaluation needed'],
        red_flags: hasEmergencySymptom ? ['Emergency symptoms detected'] : []
      },
      next_steps: [
        urgency === 'emergency' ? 'Go to emergency room immediately' : 
        urgency === 'urgent' ? 'Contact urgent care or call doctor within 24 hours' :
        'Schedule appointment with healthcare provider'
      ],
      when_to_seek_emergency_care: [
        'If symptoms suddenly worsen',
        'If you experience severe chest pain or difficulty breathing',
        'If you become confused or lose consciousness',
        'If you have severe allergic reactions'
      ],
      estimated_wait_time: urgency === 'emergency' ? 'Immediate' : 
                          urgency === 'urgent' ? '30-60 minutes' : '1-2 hours',
      cost_considerations: 'Emergency care is most expensive, urgent care moderate cost, clinics typically least expensive'
    };
  }

  /**
   * Test the get_weather function that's implemented in the Databricks agent
   */
  public async testWeatherFunction(city: string): Promise<any> {
    try {
      console.log(`Testing weather function via backend API for city: ${city}`);
      
      const response = await fetch(`${this.baseUrl}/databricks/weather-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city })
      });
      
      const result = await response.json();
      console.log('Weather function response:', result);
      
      if (!response.ok && !result.error) {
        throw new Error(result.message || 'Backend API error');
      }
      
      return result;
    } catch (error: any) {
      console.error('Weather function test failed:', error);
      throw error;
    }
  }

  /**
   * Get service status and configuration
   */
  public getStatus(): {
    configured: boolean;
    workspace: string;
    endpoint: string;
    hasToken: boolean;
  } {
    return {
      configured: !!(this.config.token && this.config.workspace && this.config.agentEndpoint),
      workspace: this.config.workspace,
      endpoint: this.config.agentEndpoint,
      hasToken: !!this.config.token
    };
  }
}

export default DatabricksService.getInstance();