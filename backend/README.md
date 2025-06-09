# CareConnect Backend API

Backend API server for CareConnect AI-powered travel health assistant. Provides secure server-side integration with Databricks AI services.

## Overview

This backend service handles:
- Databricks AI agent communication
- Healthcare symptom analysis
- Provider recommendations
- Travel health advice
- API authentication and security

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Start with auto-reload
npm run dev
```

## API Endpoints

### Health Check
- `GET /api/health` - Backend status and configuration

### Databricks Integration
- `POST /api/databricks/test` - Test Databricks connection
- `POST /api/databricks/analyze-symptoms` - AI symptom analysis
- `POST /api/databricks/weather-test` - Test weather function

## Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
REACT_APP_DATABRICKS_TOKEN=your_token
REACT_APP_DATABRICKS_WORKSPACE=your_workspace
REACT_APP_DATABRICKS_AGENT_ENDPOINT=your_endpoint
ALLOWED_ORIGINS=http://localhost:3000
```

## API Usage Examples

### Test Connection
```bash
curl -X POST http://localhost:3001/api/databricks/test
```

### Analyze Symptoms
```bash
curl -X POST http://localhost:3001/api/databricks/analyze-symptoms \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Development

The backend integrates with:
- **Frontend**: React app on port 3000
- **Databricks**: AI agent for healthcare recommendations
- **APIs**: Google Maps/Places (via frontend)

## Production Deployment

For production:
1. Set environment variables securely
2. Configure CORS for production domains
3. Add authentication/authorization
4. Set up monitoring and logging
5. Use process manager (PM2, systemd)

## Security

- All Databricks tokens handled server-side
- CORS configured for frontend access
- Error responses sanitized
- No sensitive data in client responses