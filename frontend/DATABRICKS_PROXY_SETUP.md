# Databricks Proxy Setup

This proxy server solves CORS (Cross-Origin Resource Sharing) issues when testing Databricks API from the browser during development.

## Problem
Browsers block direct requests from `http://localhost:3000` to `https://dbc-c1176c62-ee6c.cloud.databricks.com` due to CORS policy. The Databricks endpoint doesn't include the necessary CORS headers for browser requests.

## Solution
A simple Node.js proxy server that:
1. Accepts requests from the React app (localhost:3000)
2. Forwards them to Databricks with proper headers
3. Returns the response back to the browser

## Setup Instructions

### 1. Install Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install proxy dependencies
npm install --save-dev express cors node-fetch@2
```

### 2. Start the Proxy Server
```bash
# In a separate terminal (while React app runs on port 3000)
node proxy-server.js
```

The proxy server will start on http://localhost:3001

### 3. Enable Proxy Mode
Update your `.env` file:
```env
REACT_APP_USE_DATABRICKS_PROXY=true
```

### 4. Restart React App
Stop and restart your React development server to pick up the environment variable change:
```bash
npm start
```

## Testing

1. Go to http://localhost:3000
2. Navigate to "Databricks Test" tab
3. Click "Test Connection" - should now work without CORS errors
4. Click "Test Weather Function" - will show the actual Databricks agent response

## Proxy Endpoints

- **POST /api/databricks** - Proxy Databricks requests
- **GET /health** - Health check

## Request Format

The proxy expects this format:
```json
{
  "token": "your_databricks_token",
  "workspace": "your_workspace_url", 
  "endpoint": "your_endpoint_name",
  "payload": {
    "messages": [...]
  }
}
```

## Production Considerations

For production deployment:
1. **Backend Integration**: Move Databricks API calls to your backend
2. **Environment Variables**: Keep tokens secure on server-side
3. **CORS Configuration**: Configure Databricks workspace CORS settings
4. **API Gateway**: Use AWS API Gateway or similar for production proxy

## Troubleshooting

### Port 3001 Already in Use
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Proxy Not Working
1. Check proxy server logs for errors
2. Verify `.env` has `REACT_APP_USE_DATABRICKS_PROXY=true`
3. Restart React app after changing environment variables
4. Check browser network tab for proxy requests

### Still Getting CORS Errors
1. Verify proxy server is running on port 3001
2. Check that React app is making requests to localhost:3001, not Databricks directly
3. Look at console logs to see which mode is being used

## Status Messages

- ✅ Direct mode working: Databricks endpoint allows browser requests
- ⚠️ CORS Issue: Need to use proxy or configure CORS
- ✅ Proxy mode working: Requests go through localhost:3001
- ❌ Proxy unavailable: Proxy server not running or blocked

This proxy setup allows full testing of Databricks integration during development while maintaining security and preparing for proper production deployment.