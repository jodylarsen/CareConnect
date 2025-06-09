import React, { useEffect, useRef, useState } from 'react';

const SimpleMapTest: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    initializeSimpleMap();
  }, []);

  const initializeSimpleMap = async () => {
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setStatus('ERROR: Google Maps API key is missing');
        return;
      }

      setStatus(`API Key found: ${apiKey.substring(0, 10)}...`);

      // Simple script loading approach
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setStatus('Google Maps script loaded successfully');
        
        if (!mapRef.current) {
          setStatus('ERROR: Map container not found');
          return;
        }

        try {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.0060 }, // New York
            zoom: 13,
          });

          setStatus('SUCCESS: Map created and displayed');
        } catch (mapError) {
          setStatus(`ERROR creating map: ${mapError}`);
        }
      };

      script.onerror = () => {
        setStatus('ERROR: Failed to load Google Maps script');
      };

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        setStatus('Google Maps script already loaded');
        if (window.google && window.google.maps) {
          const map = new google.maps.Map(mapRef.current!, {
            center: { lat: 40.7128, lng: -74.0060 },
            zoom: 13,
          });
          setStatus('SUCCESS: Map created with existing script');
        }
      } else {
        document.head.appendChild(script);
      }

    } catch (error) {
      setStatus(`ERROR: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Simple Google Maps Test</h3>
      <p><strong>Status:</strong> {status}</p>
      <div 
        ref={mapRef} 
        style={{ 
          height: '400px', 
          width: '100%', 
          border: '2px solid #ccc',
          marginTop: '20px'
        }} 
      />
    </div>
  );
};

export default SimpleMapTest;