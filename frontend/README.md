# CareConnect Frontend

React TypeScript frontend for the CareConnect AI-powered travel health assistant.

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
1. Copy `.env.example` to `.env`
2. Configure Google OAuth 2.0 credentials
3. Set Google Maps API key
4. Configure Databricks API endpoint

### 3. Google Cloud Console Setup

#### OAuth 2.0 Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google+ API
   - Google Maps JavaScript API
   - Google Places API
   - Google Geolocation API

4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`

5. Create API Key for Maps:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to your domain for production

### 4. Databricks Integration

The frontend connects directly to Zach's Databricks API endpoints. Configure the API URL in your `.env` file:

```
REACT_APP_CARECONNECT_API_URL=https://your-databricks-workspace.cloud.databricks.com/api/careconnect
```

### 5. Development Server
```bash
npm start
```

Opens [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.tsx         # Google OAuth login
│   │   ├── Dashboard.tsx     # Main dashboard
│   │   └── *.css            # Component styles
│   ├── services/
│   │   └── auth.ts          # Authentication service
│   ├── config/
│   │   └── google.ts        # Google API configuration
│   ├── App.tsx              # Main application
│   └── index.tsx            # Entry point
├── package.json
└── tsconfig.json
```

## Authentication Flow

1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Frontend exchanges code for access tokens
6. User profile is loaded and stored in session

## API Integration

The frontend is designed to integrate with:
- **Zach's Databricks API**: LLM endpoints for healthcare recommendations
- **Google APIs**: Maps, Places, OAuth 2.0
- **Healthcare Data**: Processed by Satish (Nimble) and Joshua (Mimilabs)

## Next Steps

1. **Google Maps Integration**: Add map components for location services
2. **Healthcare Search**: Implement provider search interface
3. **Symptom Input**: Create symptom assessment forms
4. **API Integration**: Connect to Zach's Databricks endpoints
5. **Location Services**: Implement real-time location tracking

## Available Scripts

- `npm start`: Development server
- `npm build`: Production build
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

## Deployment

For production deployment:
1. Update OAuth redirect URIs in Google Cloud Console
2. Configure production API endpoints
3. Build and deploy to your hosting platform