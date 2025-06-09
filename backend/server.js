const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// Databricks configuration
const DATABRICKS_CONFIG = {
  token: process.env.REACT_APP_DATABRICKS_TOKEN || 'dapi31ca55209e41ef026b748e45e35a005e',
  workspace: process.env.REACT_APP_DATABRICKS_WORKSPACE || 'dbc-c1176c62-ee6c.cloud.databricks.com',
  endpoint: process.env.REACT_APP_DATABRICKS_AGENT_ENDPOINT || 'agents_team12a-default-quickstart_agent'
};

const DATABRICKS_URL = `https://${DATABRICKS_CONFIG.workspace}/serving-endpoints/${DATABRICKS_CONFIG.endpoint}/invocations`;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CareConnect backend is running',
    databricks: {
      configured: !!(DATABRICKS_CONFIG.token && DATABRICKS_CONFIG.workspace && DATABRICKS_CONFIG.endpoint),
      workspace: DATABRICKS_CONFIG.workspace,
      endpoint: DATABRICKS_CONFIG.endpoint
    }
  });
});

// Databricks API endpoints
app.post('/api/databricks/test', async (req, res) => {
  try {
    console.log('Testing Databricks connection...');
    
    const response = await fetch(DATABRICKS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_CONFIG.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello, are you working?'
          }
        ]
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Databricks error:', response.status, responseText);
      return res.status(response.status).json({
        error: 'Databricks API error',
        status: response.status,
        message: responseText
      });
    }

    const jsonResponse = JSON.parse(responseText);
    console.log('Databricks test successful:', jsonResponse);
    
    res.json({
      success: true,
      connected: !!(jsonResponse.messages && jsonResponse.messages.length > 0),
      response: jsonResponse
    });

  } catch (error) {
    console.error('Databricks test error:', error);
    res.status(500).json({ 
      error: 'Connection test failed', 
      message: error.message 
    });
  }
});

app.post('/api/databricks/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, severity, duration, description, location, userProfile } = req.body;
    
    console.log('Analyzing symptoms:', { symptoms, severity, duration });
    
    const prompt = buildSymptomAnalysisPrompt({
      symptoms, severity, duration, description, location, userProfile
    });
    
    const response = await fetch(DATABRICKS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_CONFIG.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a healthcare AI assistant that analyzes symptoms and provides healthcare recommendations. Always prioritize patient safety and recommend seeking emergency care when appropriate. Provide structured JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Databricks symptom analysis error:', response.status, responseText);
      
      // Parse error for function calling issues
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message && errorJson.message.includes('get_weather')) {
          console.warn('Databricks agent has function calling issues, providing fallback');
          const fallback = createFallbackRecommendationFromSymptoms({
            symptoms, severity, duration, description, location, userProfile
          });
          return res.json(fallback);
        }
      } catch (parseError) {
        // Continue with regular error handling
      }
      
      return res.status(response.status).json({
        error: 'Databricks API error',
        status: response.status,
        message: responseText
      });
    }

    const jsonResponse = JSON.parse(responseText);
    console.log('Symptom analysis successful');
    
    // Parse the healthcare response
    const recommendation = parseHealthcareResponse(jsonResponse);
    res.json(recommendation);

  } catch (error) {
    console.error('Symptom analysis error:', error);
    
    // Provide fallback recommendation
    try {
      const fallback = createFallbackRecommendationFromSymptoms(req.body);
      res.json(fallback);
    } catch (fallbackError) {
      res.status(500).json({ 
        error: 'Symptom analysis failed', 
        message: error.message 
      });
    }
  }
});

app.post('/api/databricks/search-healthcare-providers', async (req, res) => {
  try {
    const { location, filters = {} } = req.body;
    const { type = 'all', radius = 5000, minRating = 0 } = filters;
    
    console.log('Searching healthcare providers:', { location, filters });
    
    // Build SQL query to search the Google Maps businesses table
    let categoryFilter = '';
    if (type !== 'all') {
      const categoryMappings = {
        'hospital': 'Hospital',
        'urgent_care': 'urgent care',
        'clinic': 'Medical clinic',
        'pharmacy': 'Pharmacy',
        'dentist': 'Dentist',
        'doctor': 'Doctor'
      };
      const category = categoryMappings[type] || type;
      categoryFilter = `AND LOWER(category) LIKE '%${category.toLowerCase()}%'`;
    }
    
    // Calculate distance bounds (approximate)
    const mileRadius = radius * 0.000621371; // Convert meters to miles
    const latDelta = mileRadius / 69; // Roughly 69 miles per degree of latitude
    const lngDelta = mileRadius / (69 * Math.cos(location.lat * Math.PI / 180));
    
    const query = `
      SELECT 
        name,
        category,
        address,
        lat,
        lon as lng,
        phone_number,
        open_website as website,
        SQRT(
          POWER((lat - ${location.lat}) * 69, 2) + 
          POWER((lon - ${location.lng}) * 69 * COS(${location.lat} * PI() / 180), 2)
        ) as distance_miles
      FROM \`dais-hackathon-2025\`.bright_initiative.google_maps_businesses 
      WHERE 
        (LOWER(category) LIKE '%health%' 
         OR LOWER(category) LIKE '%medical%' 
         OR LOWER(category) LIKE '%doctor%' 
         OR LOWER(category) LIKE '%hospital%' 
         OR LOWER(category) LIKE '%clinic%'
         OR LOWER(category) LIKE '%dentist%'
         OR LOWER(category) LIKE '%pharmacy%'
         OR LOWER(category) LIKE '%urgent%')
        ${categoryFilter}
        AND lat BETWEEN ${location.lat - latDelta} AND ${location.lat + latDelta}
        AND lon BETWEEN ${location.lng - lngDelta} AND ${location.lng + lngDelta}
        AND name IS NOT NULL 
        AND address IS NOT NULL
        AND lat IS NOT NULL 
        AND lon IS NOT NULL
      ORDER BY distance_miles
      LIMIT 25
    `;
    
    console.log('Executing healthcare provider search query...');
    
    const response = await fetch(`https://${DATABRICKS_CONFIG.workspace}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_CONFIG.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement: query,
        warehouse_id: '4cd935fe92ad4d95', // Use the Serverless Starter Warehouse
        wait_timeout: '30s'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Databricks SQL error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Database query failed',
        message: errorText
      });
    }

    const result = await response.json();
    
    if (result.status?.state === 'FAILED') {
      console.error('SQL execution failed:', result.status.error);
      return res.status(400).json({
        error: 'SQL execution failed',
        message: result.status.error.message
      });
    }

    // Parse results
    const providers = [];
    if (result.result?.data_array && result.manifest?.schema?.columns) {
      const columns = result.manifest.schema.columns.map(col => col.name);
      
      for (const row of result.result.data_array) {
        const provider = {};
        columns.forEach((col, index) => {
          provider[col] = row[index];
        });
        
        // Convert to expected format
        const formattedProvider = {
          id: `db_${provider.name}_${provider.lat}_${provider.lng}`.replace(/[^a-zA-Z0-9_]/g, '_'),
          placeId: `db_${provider.name}_${provider.lat}_${provider.lng}`.replace(/[^a-zA-Z0-9_]/g, '_'),
          name: provider.name,
          address: provider.address,
          location: {
            lat: parseFloat(provider.lat),
            lng: parseFloat(provider.lng)
          },
          type: mapCategoryToType(provider.category),
          phone: provider.phone_number,
          website: provider.website,
          distance: parseFloat(provider.distance_miles),
          businessStatus: 'OPERATIONAL'
        };
        
        providers.push(formattedProvider);
      }
    }
    
    console.log(`Found ${providers.length} healthcare providers`);
    
    res.json({
      success: true,
      providers: providers,
      total: providers.length
    });

  } catch (error) {
    console.error('Healthcare provider search error:', error);
    res.status(500).json({ 
      error: 'Healthcare provider search failed', 
      message: error.message 
    });
  }
});

function mapCategoryToType(category) {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('hospital')) return 'hospital';
  if (categoryLower.includes('urgent')) return 'urgent_care';
  if (categoryLower.includes('clinic')) return 'clinic';
  if (categoryLower.includes('pharmacy')) return 'pharmacy';
  if (categoryLower.includes('dentist')) return 'dentist';
  if (categoryLower.includes('doctor')) return 'doctor';
  return 'health';
}

app.post('/api/databricks/weather-test', async (req, res) => {
  try {
    const { city = 'New York' } = req.body;
    
    console.log(`Testing weather function for city: ${city}`);
    
    const response = await fetch(DATABRICKS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DATABRICKS_CONFIG.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `What's the weather like in ${city}?`
          }
        ]
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Weather test error:', response.status, responseText);
      
      // Check for function calling issues
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message && errorJson.message.includes('get_weather')) {
          return res.json({
            error: 'Function exists but has implementation issues',
            details: errorJson.message,
            functionName: 'get_weather',
            issue: 'Missing required city argument in function definition'
          });
        }
      } catch (parseError) {
        // Continue with regular error handling
      }
      
      return res.status(response.status).json({
        error: 'Weather test failed',
        status: response.status,
        message: responseText
      });
    }

    const jsonResponse = JSON.parse(responseText);
    console.log('Weather test response:', jsonResponse);
    
    res.json({
      success: true,
      response: jsonResponse
    });

  } catch (error) {
    console.error('Weather test error:', error);
    res.status(500).json({ 
      error: 'Weather test failed', 
      message: error.message 
    });
  }
});

// Utility functions (moved from frontend)
function buildSymptomAnalysisPrompt(request) {
  const { symptoms, severity, duration, description, location, userProfile } = request;

  return `
Analyze these symptoms and provide healthcare recommendations:

SYMPTOMS: ${symptoms.join(', ')}
SEVERITY: ${severity}
DURATION: ${duration}
DESCRIPTION: ${description}

PATIENT CONTEXT:
- Location: ${location?.city || 'Unknown'}, ${location?.state || 'Unknown'}
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

function parseHealthcareResponse(response) {
  try {
    let content = '';
    if (response.messages && response.messages[0] && response.messages[0].content) {
      content = response.messages[0].content;
    } else if (response.choices && response.choices[0] && response.choices[0].message) {
      content = response.choices[0].message.content;
    } else if (response.response) {
      content = response.response;
    } else {
      throw new Error('Unexpected response format from Databricks');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
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
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    console.error('Failed to parse healthcare response:', error);
    throw new Error('Invalid response format from healthcare AI');
  }
}

function createFallbackRecommendationFromSymptoms(request) {
  const { symptoms, severity, duration } = request;
  
  const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe headache', 'confusion', 'loss of consciousness'];
  const urgentSymptoms = ['high fever', 'persistent vomiting', 'severe pain', 'shortness of breath'];
  
  const hasEmergencySymptom = symptoms.some(s => 
    emergencySymptoms.some(es => s.toLowerCase().includes(es.toLowerCase()))
  );
  const hasUrgentSymptom = symptoms.some(s => 
    urgentSymptoms.some(us => s.toLowerCase().includes(us.toLowerCase()))
  );
  
  let recommendedCareType, urgency, confidence;
  
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

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CareConnect backend server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/health - Health check');
  console.log('- POST /api/databricks/test - Test Databricks connection');
  console.log('- POST /api/databricks/analyze-symptoms - Analyze symptoms');
  console.log('- POST /api/databricks/weather-test - Test weather function');
  console.log(`\nDatabricks configuration:`);
  console.log(`- Workspace: ${DATABRICKS_CONFIG.workspace}`);
  console.log(`- Endpoint: ${DATABRICKS_CONFIG.endpoint}`);
  console.log(`- Token: ${DATABRICKS_CONFIG.token ? 'Present' : 'Missing'}`);
});