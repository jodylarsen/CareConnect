# CareConnect Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Google API Integration](#google-api-integration)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)

## Overview

CareConnect is an AI-powered travel health assistant that provides intelligent healthcare recommendations by combining:

- **Real-time location data** from Google APIs
- **Personal health profiles** and travel patterns
- **Comprehensive healthcare provider databases**
- **Accessibility and quality assessments**

### Core Capabilities

1. **Symptom-Based Healthcare Matching**
   - Analyze user-reported symptoms
   - Match with appropriate healthcare provider types
   - Consider urgency levels and care requirements

2. **Location-Aware Recommendations**
   - Real-time GPS positioning via Google Location Services
   - Travel pattern recognition
   - Distance and accessibility calculations

3. **Personalized Healthcare Profiles**
   - Chronic condition management
   - Accessibility requirements
   - Insurance and budget considerations
   - Previous healthcare preferences

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Client   │    │   Databricks    │    │  Google APIs    │
│                 │    │   CareConnect   │    │                 │
│ - Web App       │◄──►│                 │◄──►│ - Maps API      │
│ - Mobile App    │    │ - ML Models     │    │ - Places API    │
│ - Notebooks     │    │ - Data Pipeline │    │ - Location API  │
│ - Dashboards    │    │ - Healthcare DB │    │ - OAuth 2.0     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **User Authentication** → Google OAuth 2.0 integration
2. **Location Acquisition** → Google Location Services
3. **Symptom Analysis** → AI-powered healthcare matching
4. **Provider Search** → Google Places API + Healthcare databases
5. **Recommendation Engine** → Personalized ranking and filtering
6. **Result Delivery** → Contextual healthcare recommendations

## Google API Integration

### Required APIs

- **Google Maps JavaScript API** - Interactive maps and location display
- **Google Places API** - Healthcare facility search and details
- **Google Geolocation API** - Real-time location services
- **Google OAuth 2.0** - User authentication and profile access

### API Configuration in Databricks

```python
# Databricks configuration
import requests
from databricks import secrets

google_config = {
    "api_key": dbutils.secrets.get(scope="careconnect", key="google_maps_api_key"),
    "libraries": ["places", "geometry"],
    "version": "weekly"
}
```

### Location Services Integration

```python
# Location acquisition in Databricks
import googlemaps
from geopy.geocoders import Nominatim

def get_location_from_ip():
    """Get approximate location from IP address for demo purposes"""
    response = requests.get('http://ipapi.co/json/')
    data = response.json()
    return {
        'lat': data.get('latitude'),
        'lng': data.get('longitude'),
        'city': data.get('city'),
        'region': data.get('region')
    }

def find_nearby_healthcare(location, symptoms):
    """Find healthcare providers using Google Places API"""
    gmaps = googlemaps.Client(key=google_config["api_key"])
    places_result = gmaps.places_nearby(
        location=(location['lat'], location['lng']),
        radius=5000,
        type='hospital'
    )
    return places_result
```

## Setup & Installation

### Prerequisites

- Databricks workspace and cluster access
- Python 3.9+ (included in Databricks runtime)
- Google Cloud Platform account
- Google API credentials
- Healthcare provider database access

### Environment Setup

1. **Import to Databricks**
   ```python
   # Clone repository into Databricks workspace
   %sh git clone https://github.com/DataSciWithJoshua/CareConnect.git /Workspace/Repos/CareConnect
   ```

2. **Install Dependencies**
   ```python
   # Install required packages in Databricks notebook
   %pip install -r requirements.txt
   ```

3. **Configure Databricks Secrets**
   ```python
   # Set up secrets in Databricks secret scope
   dbutils.secrets.help()
   # Configure secrets for Google APIs and database connections
   ```

### Required Environment Variables

```python
# Databricks secrets configuration
GOOGLE_MAPS_API_KEY = dbutils.secrets.get(scope="careconnect", key="google_maps_api_key")
GOOGLE_OAUTH_CLIENT_ID = dbutils.secrets.get(scope="careconnect", key="google_oauth_client_id")
GOOGLE_OAUTH_CLIENT_SECRET = dbutils.secrets.get(scope="careconnect", key="google_oauth_client_secret")
HEALTHCARE_DB_CONNECTION = dbutils.secrets.get(scope="careconnect", key="healthcare_db_connection")
AI_API_ENDPOINT = dbutils.secrets.get(scope="careconnect", key="ai_api_endpoint")
```

## Configuration

### Google Cloud Setup

1. **Enable Required APIs**
   - Maps JavaScript API
   - Places API
   - Geolocation API
   - OAuth 2.0

2. **Create API Credentials**
   - API Key for Maps/Places services
   - OAuth 2.0 Client ID for user authentication

3. **Configure API Restrictions**
   - Restrict API key to specific domains
   - Set up OAuth consent screen
   - Configure authorized redirect URIs

### Healthcare Provider Database

Configure connections to healthcare databases:
- Provider directories
- Facility ratings and reviews
- Accessibility information
- Insurance acceptance data

## Usage Guide

### Basic Workflow

1. **User Authentication**
   ```python
   # OAuth 2.0 integration with Google
   from google.auth.transport.requests import Request
   from google.oauth2.credentials import Credentials
   
   def authenticate_user():
       creds = Credentials.from_authorized_user_info(user_info)
       return creds
   ```

2. **Location Detection**
   ```python
   # Get location data
   def get_current_location():
       location = get_location_from_ip()  # or from user input
       return location
   ```

3. **Symptom Analysis**
   ```python
   # Process user symptoms with ML models
   from pyspark.ml import Pipeline
   from pyspark.ml.feature import Tokenizer, HashingTF
   
   def analyze_symptoms(user_input):
       # Use Databricks ML for symptom analysis
       symptoms_df = spark.createDataFrame([(user_input,)], ["symptoms"])
       # Apply trained ML model for healthcare recommendations
       return analysis_result
   ```

4. **Healthcare Provider Search**
   ```python
   # Find relevant providers using Google Places API
   def find_healthcare_providers(location, analysis):
       providers = find_nearby_healthcare(location, analysis)
       return providers
   ```

5. **Recommendation Display**
   ```python
   # Display results in Databricks dashboard
   import plotly.express as px
   
   def display_recommendations(providers, user_profile):
       # Create interactive visualizations
       fig = px.scatter_mapbox(providers_df, lat="lat", lon="lng", 
                              hover_name="name", zoom=12)
       fig.show()
   ```

### Advanced Features

#### Chronic Condition Management
- Configure ongoing healthcare needs
- Set up provider type preferences
- Enable accessibility filtering

#### Travel Planning Integration
- Destination healthcare assessment
- Route-based provider recommendations
- Emergency contact integration

## API Reference

### Core Endpoints

#### Health Assessment
```
POST /api/assess
Content-Type: application/json

{
  "symptoms": ["headache", "fever"],
  "severity": "moderate",
  "duration": "2 days"
}
```

#### Provider Search
```
GET /api/providers/search
?lat=40.7128&lng=-74.0060
&type=urgent_care
&radius=5000
&accessibility=wheelchair
```

#### User Profile Management
```
GET /api/profile
PUT /api/profile
POST /api/profile/conditions
```

### Response Formats

```json
{
  "providers": [
    {
      "id": "provider_123",
      "name": "City Medical Center",
      "type": "urgent_care",
      "location": {
        "lat": 40.7128,
        "lng": -74.0060,
        "address": "123 Health St, New York, NY"
      },
      "rating": 4.5,
      "accessibility": {
        "wheelchair_accessible": true,
        "parking": true,
        "public_transport": true
      },
      "distance_meters": 850,
      "estimated_wait": "15-30 minutes",
      "accepts_insurance": ["BlueCross", "Aetna"]
    }
  ]
}
```

## Development

### Databricks Development Setup

1. **Create Databricks Notebook**
   ```python
   # Start with a new Python notebook in Databricks
   # Import the CareConnect modules
   import sys
   sys.path.append('/Workspace/Repos/CareConnect')
   ```

2. **Run Tests**
   ```python
   # Run tests in Databricks notebook cells
   %run ./tests/test_careconnect
   ```

3. **Code Quality**
   ```python
   # Install and run linting tools
   %pip install black flake8
   %sh black /Workspace/Repos/CareConnect/
   %sh flake8 /Workspace/Repos/CareConnect/
   ```

### Contributing Guidelines

- Follow existing code style and patterns
- Add tests for new features
- Update documentation for API changes
- Ensure privacy and security compliance

## Deployment

### Databricks Production Considerations

- **Security**: Use Databricks secret scopes for API key management
- **Scalability**: Configure cluster auto-scaling and job scheduling
- **Monitoring**: Implement Databricks job monitoring and alerts
- **Compliance**: Ensure HIPAA and data privacy requirements with Databricks security features

### Databricks Environment Configuration

- **Development**: Databricks workspace with shared clusters, test secret scopes
- **Staging**: Dedicated staging workspace with restricted API access
- **Production**: Production workspace with high-concurrency clusters and encrypted storage

## Security Considerations

### Data Privacy
- **Minimal Data Collection**: Only collect necessary health information
- **Encryption**: All data encrypted in transit and at rest
- **Anonymization**: Remove personally identifiable information where possible
- **Retention Policies**: Implement data deletion schedules

### API Security
- **Rate Limiting**: Prevent API abuse and ensure fair usage
- **Authentication**: Secure OAuth 2.0 implementation
- **Input Validation**: Sanitize all user inputs
- **Error Handling**: Avoid exposing sensitive system information

### Compliance
- **HIPAA**: Health information privacy requirements
- **GDPR**: European data protection compliance
- **Regional Regulations**: Local healthcare data laws

### Google API Security
- **API Key Restrictions**: Limit keys to specific domains and IPs
- **Quota Management**: Monitor and limit API usage
- **Credential Rotation**: Regular API key updates
- **Audit Logging**: Track all API interactions

---

For additional support or questions, please refer to the main [README](../README.md) or open an issue in the repository.