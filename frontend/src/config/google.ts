// Google OAuth 2.0 Configuration
export const GOOGLE_CONFIG = {
  // Client ID from Google Cloud Console
  CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '263645119739-lu10b37f8qg7kba7qt5co8hv40j1knga.apps.googleusercontent.com',
  
  // OAuth 2.0 Scopes
  SCOPES: [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/user.birthday.read',
    'https://www.googleapis.com/auth/user.gender.read'
  ],
  
  // Redirect URI (will be configured in Google Cloud Console)
  REDIRECT_URI: process.env.REACT_APP_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  
  // Response type for OAuth flow
  RESPONSE_TYPE: 'code',
  
  // Access type for refresh tokens
  ACCESS_TYPE: 'offline',
  
  // Prompt for consent
  PROMPT: 'consent'
};

// Google Maps API Configuration
export const GOOGLE_MAPS_CONFIG = {
  API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  LIBRARIES: ['places', 'geometry'] as const,
  VERSION: 'weekly'
};

// OAuth 2.0 URLs
export const GOOGLE_OAUTH_URLS = {
  AUTHORIZATION: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN: 'https://oauth2.googleapis.com/token',
  USER_INFO: 'https://www.googleapis.com/oauth2/v2/userinfo',
  PEOPLE_API: 'https://people.googleapis.com/v1/people/me'
};