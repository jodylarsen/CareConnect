import React, { useState } from 'react';
import { User } from '../services/auth';
import HealthcareSearch from './HealthcareSearch';
import SymptomChecker from './SymptomChecker';
import TravelHealth from './TravelHealth';
import Tests from './Tests';
import './Dashboard.css';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'healthcare' | 'symptoms' | 'travel' | 'tests'>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'tests':
        return <Tests />;
      case 'healthcare':
        return <HealthcareSearch />;
      case 'symptoms':
        return <SymptomChecker />;
      case 'travel':
        return <TravelHealth />;
      case 'dashboard':
      default:
        return (
          <div className="dashboard-content">
            <div className="quick-actions">
              <h3>How can we help you today?</h3>
              <div className="action-grid">
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('healthcare')}
                >
                  <span className="action-icon">🏥</span>
                  <div>
                    <h4>Find Healthcare</h4>
                    <p>Search nearby providers by location</p>
                  </div>
                </button>
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('symptoms')}
                >
                  <span className="action-icon">🩺</span>
                  <div>
                    <h4>Symptom Checker</h4>
                    <p>Get AI-powered healthcare recommendations</p>
                  </div>
                </button>
                
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('travel')}
                >
                  <span className="action-icon">🗺️</span>
                  <div>
                    <h4>Travel Health</h4>
                    <p>Plan healthcare for your trip</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="status-section">
              <h3>System Status</h3>
              <div className="status-items">
                <div className="status-item">
                  <span className="status-indicator success"></span>
                  <span>Google Authentication: Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-indicator success"></span>
                  <span>Google Maps: Connected</span>
                </div>
                <div className="status-item">
                  <span className="status-indicator pending"></span>
                  <span>Healthcare API: Ready for Integration</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard">
      <div className="user-header">
        <div className="user-info">
          <img 
            src={user.picture} 
            alt={user.name}
            className="user-avatar"
          />
          <div>
            <h2>Welcome, {user.name}!</h2>
            <div className="user-details">
              <p>{user.email}</p>
              {(user.age_range || user.gender) && (
                <p className="user-demographics">
                  {user.age_range && (
                    <span>Age: {user.age_range.min}{user.age_range.max ? `-${user.age_range.max}` : '+'}</span>
                  )}
                  {user.age_range && user.gender && <span className="separator"> • </span>}
                  {user.gender && <span>Gender: {user.gender}</span>}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            CareConnect
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            🧪 Tests & Diagnostics
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default Dashboard;