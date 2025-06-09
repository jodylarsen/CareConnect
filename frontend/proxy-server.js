const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Databricks proxy endpoint
app.post('/api/databricks', async (req, res) => {
  try {
    const { token, workspace, endpoint, payload } = req.body;
    
    if (!token || !workspace || !endpoint) {
      return res.status(400).json({ 
        error: 'Missing required parameters: token, workspace, endpoint' 
      });
    }

    const databricksUrl = `https://${workspace}/serving-endpoints/${endpoint}/invocations`;
    
    console.log('Proxying request to:', databricksUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(databricksUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
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
    console.log('Success response:', jsonResponse);
    res.json(jsonResponse);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Databricks proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`Databricks proxy server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/databricks - Proxy requests to Databricks');
  console.log('- GET /health - Health check');
});