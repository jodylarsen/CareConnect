import React, { useState } from 'react';
import APITest from './APITest';
import GoogleServicesTest from './GoogleServicesTest';
import SimpleMapTest from './SimpleMapTest';
import DatabricksTest from './DatabricksTest';
import './Tests.css';

const Tests: React.FC = () => {
  const [activeTest, setActiveTest] = useState<'api' | 'google' | 'map' | 'databricks'>('api');

  const renderTest = () => {
    switch (activeTest) {
      case 'api':
        return <APITest />;
      case 'google':
        return <GoogleServicesTest />;
      case 'map':
        return <SimpleMapTest />;
      case 'databricks':
        return <DatabricksTest />;
      default:
        return <APITest />;
    }
  };

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h2>System Tests & Diagnostics</h2>
        <p>Test various system components and integrations</p>
      </div>

      <div className="test-navigation">
        <button 
          className={`test-nav-btn ${activeTest === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTest('api')}
        >
          🔗 API Test
        </button>
        <button 
          className={`test-nav-btn ${activeTest === 'google' ? 'active' : ''}`}
          onClick={() => setActiveTest('google')}
        >
          🌐 Google Services
        </button>
        <button 
          className={`test-nav-btn ${activeTest === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTest('map')}
        >
          🗺️ Map Test
        </button>
        <button 
          className={`test-nav-btn ${activeTest === 'databricks' ? 'active' : ''}`}
          onClick={() => setActiveTest('databricks')}
        >
          🤖 Databricks AI
        </button>
      </div>

      <div className="test-content">
        {renderTest()}
      </div>
    </div>
  );
};

export default Tests;