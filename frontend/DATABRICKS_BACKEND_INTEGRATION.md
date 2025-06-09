# Databricks Backend Integration

This document describes the backend API integration approach for Databricks services, replacing the previous proxy approach.

## Architecture

Instead of using a client-side proxy, CareConnect now integrates with Databricks through a dedicated backend API service that:

1. Handles all Databricks API authentication and requests server-side
2. Provides clean REST endpoints for the frontend
3. Maintains security by keeping tokens on the backend
4. Enables proper error handling and response formatting

## Backend Integration

The frontend connects to backend API endpoints at `http://localhost:3001/api` with the following structure:

### Available Endpoints

- **POST /api/databricks/test** - Test Databricks connection
- **POST /api/databricks/analyze-symptoms** - AI-powered symptom analysis
- **POST /api/databricks/weather-test** - Test weather function (example)

### Request Format

Frontend sends clean requests to backend:

```json
{
  "symptoms": ["headache", "fever"],
  "severity": "moderate",
  "duration": "2 days",
  "description": "Persistent headache with mild fever",
  "location": {
    "city": "Fort Lauderdale",
    "state": "FL",
    "lat": 26.1224,
    "lng": -80.1373
  }
}
```

### Backend Responsibilities

The backend service (to be implemented by Zach) handles:
- Databricks authentication with tokens
- Request formatting for Databricks agents
- Response parsing and error handling
- CORS headers for frontend access
- Security and rate limiting

## Frontend Configuration

Environment variables in `.env`:

```env
# Backend API configuration (no proxy needed)
REACT_APP_API_BASE_URL=http://localhost:3001/api

# Databricks Configuration (for reference only)
REACT_APP_DATABRICKS_TOKEN=dapi31ca55209e41ef026b748e45e35a005e
REACT_APP_DATABRICKS_WORKSPACE=dbc-c1176c62-ee6c.cloud.databricks.com
REACT_APP_DATABRICKS_AGENT_ENDPOINT=agents_team12a-default-quickstart_agent
```

## Testing

1. Start the backend API service on port 3001
2. Start the React app on port 3000
3. Navigate to "Tests" tab → "Databricks Test"
4. Test connection and symptom analysis features

## Implementation Status

✅ **Frontend Integration**: Complete - DatabricksService class ready for backend API
🔧 **Backend API**: Pending implementation by Zach
📋 **Healthcare Tools**: Symptom analysis, provider recommendations, travel health advice

## Production Deployment

For production:
1. **Environment Variables**: Configure production API endpoints
2. **Authentication**: Backend handles all Databricks authentication
3. **Monitoring**: Add logging and health checks
4. **Scaling**: Backend can handle multiple frontend instances
5. **Security**: All sensitive tokens remain on backend

This approach provides better security, maintainability, and scalability compared to client-side proxy solutions.