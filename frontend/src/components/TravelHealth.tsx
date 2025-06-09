import React, { useState } from 'react';
import './TravelHealth.css';

interface Destination {
  country: string;
  region?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface Vaccination {
  name: string;
  required: boolean;
  recommended: boolean;
  description: string;
}

interface HealthAlert {
  type: 'outbreak' | 'advisory' | 'warning';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

const TravelHealth: React.FC = () => {
  const [destination, setDestination] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('');
  const [tripDuration, setTripDuration] = useState<string>('');
  const [travelPurpose, setTravelPurpose] = useState<string>('');
  const [showRecommendations, setShowRecommendations] = useState(false);

  const commonDestinations: Destination[] = [
    { country: 'Thailand', riskLevel: 'medium' },
    { country: 'India', riskLevel: 'high' },
    { country: 'Mexico', riskLevel: 'medium' },
    { country: 'United Kingdom', riskLevel: 'low' },
    { country: 'Japan', riskLevel: 'low' },
    { country: 'Brazil', riskLevel: 'high' },
    { country: 'Kenya', riskLevel: 'high' },
    { country: 'France', riskLevel: 'low' },
    { country: 'Peru', riskLevel: 'high' },
    { country: 'Australia', riskLevel: 'low' }
  ];

  const getDestinationInfo = (country: string): Destination | null => {
    return commonDestinations.find(dest => 
      dest.country.toLowerCase() === country.toLowerCase()
    ) || null;
  };

  const getVaccinations = (destination: Destination): Vaccination[] => {
    const baseVaccinations: Vaccination[] = [
      {
        name: 'Routine Vaccines',
        required: true,
        recommended: true,
        description: 'MMR, DPT, Flu, COVID-19, and others'
      }
    ];

    if (destination.riskLevel === 'high') {
      return [
        ...baseVaccinations,
        {
          name: 'Hepatitis A',
          required: false,
          recommended: true,
          description: 'Recommended for most travelers to areas with poor sanitation'
        },
        {
          name: 'Hepatitis B',
          required: false,
          recommended: true,
          description: 'Recommended for travelers who may have intimate contact with locals'
        },
        {
          name: 'Yellow Fever',
          required: destination.country === 'Kenya' || destination.country === 'Brazil',
          recommended: true,
          description: 'Required for entry to certain countries'
        },
        {
          name: 'Typhoid',
          required: false,
          recommended: true,
          description: 'Recommended for travelers to areas with poor sanitation'
        }
      ];
    } else if (destination.riskLevel === 'medium') {
      return [
        ...baseVaccinations,
        {
          name: 'Hepatitis A',
          required: false,
          recommended: true,
          description: 'Recommended for travelers to areas with poor sanitation'
        }
      ];
    }

    return baseVaccinations;
  };

  const getHealthAlerts = (destination: Destination): HealthAlert[] => {
    const alerts: HealthAlert[] = [];

    if (destination.country === 'Thailand') {
      alerts.push({
        type: 'advisory',
        title: 'Dengue Fever Alert',
        description: 'Increased dengue fever activity reported. Use mosquito protection.',
        severity: 'medium'
      });
    }

    if (destination.country === 'India') {
      alerts.push({
        type: 'warning',
        title: 'Air Quality Warning',
        description: 'Poor air quality in major cities. Consider bringing masks.',
        severity: 'high'
      });
    }

    if (destination.country === 'Brazil') {
      alerts.push({
        type: 'outbreak',
        title: 'Zika Virus',
        description: 'Ongoing Zika virus transmission. Pregnant women should avoid travel.',
        severity: 'high'
      });
    }

    return alerts;
  };

  const getHealthTips = (destination: Destination): string[] => {
    const baseTips = [
      'Pack a basic first aid kit',
      'Bring any prescription medications',
      'Get travel insurance',
      'Know emergency contact numbers'
    ];

    if (destination.riskLevel === 'high') {
      return [
        ...baseTips,
        'Drink only bottled or boiled water',
        'Avoid raw or undercooked food',
        'Use insect repellent with DEET',
        'Sleep under mosquito nets',
        'Bring hand sanitizer',
        'Consider malaria prophylaxis'
      ];
    } else if (destination.riskLevel === 'medium') {
      return [
        ...baseTips,
        'Be cautious with street food',
        'Use insect repellent',
        'Stay hydrated'
      ];
    }

    return baseTips;
  };

  const handlePlanTrip = () => {
    if (destination && travelDate) {
      setShowRecommendations(true);
    }
  };

  const destinationInfo = destination ? getDestinationInfo(destination) : null;

  return (
    <div className="travel-health">
      <div className="travel-health-header">
        <h2>🗺️ Travel Health Planning</h2>
        <p>Get personalized health recommendations for your upcoming trip</p>
      </div>

      <div className="travel-planning-form">
        <div className="form-section">
          <h3>Trip Details</h3>
          
          <div className="form-group">
            <label>Destination Country</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination country"
              list="destinations"
            />
            <datalist id="destinations">
              {commonDestinations.map(dest => (
                <option key={dest.country} value={dest.country} />
              ))}
            </datalist>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Travel Date</label>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>Trip Duration</label>
              <select
                value={tripDuration}
                onChange={(e) => setTripDuration(e.target.value)}
              >
                <option value="">Select duration</option>
                <option value="1-7 days">1-7 days</option>
                <option value="1-2 weeks">1-2 weeks</option>
                <option value="2-4 weeks">2-4 weeks</option>
                <option value="1-3 months">1-3 months</option>
                <option value="3+ months">3+ months</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Purpose of Travel</label>
            <select
              value={travelPurpose}
              onChange={(e) => setTravelPurpose(e.target.value)}
            >
              <option value="">Select purpose</option>
              <option value="tourism">Tourism</option>
              <option value="business">Business</option>
              <option value="volunteering">Volunteering</option>
              <option value="study">Study/Research</option>
              <option value="visiting">Visiting Family/Friends</option>
              <option value="adventure">Adventure Travel</option>
            </select>
          </div>

          <button 
            className="plan-trip-btn"
            onClick={handlePlanTrip}
            disabled={!destination || !travelDate}
          >
            Get Health Recommendations
          </button>
        </div>

        {destinationInfo && (
          <div className="destination-preview">
            <h3>Destination Overview</h3>
            <div className="destination-card">
              <h4>{destinationInfo.country}</h4>
              <div className={`risk-level risk-${destinationInfo.riskLevel}`}>
                Health Risk Level: {destinationInfo.riskLevel.toUpperCase()}
              </div>
              <p className="risk-description">
                {destinationInfo.riskLevel === 'low' && 'Generally safe with standard precautions.'}
                {destinationInfo.riskLevel === 'medium' && 'Moderate risk - additional precautions recommended.'}
                {destinationInfo.riskLevel === 'high' && 'Higher risk - extensive precautions and preparations needed.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showRecommendations && destinationInfo && (
        <div className="travel-recommendations">
          <h3>Health Recommendations for {destinationInfo.country}</h3>
          
          {/* Health Alerts */}
          {(() => {
            const alerts = getHealthAlerts(destinationInfo);
            return alerts.length > 0 && (
              <div className="health-alerts">
                <h4>🚨 Current Health Alerts</h4>
                {alerts.map((alert, index) => (
                  <div key={index} className={`alert alert-${alert.severity}`}>
                    <div className="alert-header">
                      <span className={`alert-type ${alert.type}`}>
                        {alert.type.toUpperCase()}
                      </span>
                      <h5>{alert.title}</h5>
                    </div>
                    <p>{alert.description}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Vaccinations */}
          <div className="vaccinations-section">
            <h4>💉 Recommended Vaccinations</h4>
            <div className="vaccination-list">
              {getVaccinations(destinationInfo).map((vaccine, index) => (
                <div key={index} className={`vaccination-item ${vaccine.required ? 'required' : 'recommended'}`}>
                  <div className="vaccination-header">
                    <h5>{vaccine.name}</h5>
                    <span className={`status ${vaccine.required ? 'required' : 'recommended'}`}>
                      {vaccine.required ? 'Required' : 'Recommended'}
                    </span>
                  </div>
                  <p>{vaccine.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Health Tips */}
          <div className="health-tips">
            <h4>🏥 Health & Safety Tips</h4>
            <ul className="tips-list">
              {getHealthTips(destinationInfo).map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* Additional Resources */}
          <div className="resources-section">
            <h4>📚 Additional Resources</h4>
            <div className="resource-links">
              <div className="resource-item">
                <h5>CDC Travel Health Information</h5>
                <p>Official travel health notices and recommendations</p>
                <a 
                  href={`https://wwwnc.cdc.gov/travel/destinations/traveler/none/${destinationInfo.country.toLowerCase().replace(' ', '-')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link"
                >
                  View CDC Information →
                </a>
              </div>
              
              <div className="resource-item">
                <h5>WHO Travel Advice</h5>
                <p>World Health Organization international travel guidance</p>
                <a 
                  href="https://www.who.int/emergencies/disease-outbreak-news"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link"
                >
                  View WHO Alerts →
                </a>
              </div>

              <div className="resource-item">
                <h5>Travel Insurance</h5>
                <p>Protect yourself with comprehensive travel health insurance</p>
                <button className="resource-link secondary">
                  Find Insurance Options
                </button>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="travel-checklist">
            <h4>✅ Pre-Travel Checklist</h4>
            <div className="checklist-items">
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Consult with healthcare provider or travel medicine clinic</span>
              </label>
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Get required and recommended vaccinations</span>
              </label>
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Obtain travel health insurance</span>
              </label>
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Pack prescription medications and first aid kit</span>
              </label>
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Research local healthcare facilities at destination</span>
              </label>
              <label className="checklist-item">
                <input type="checkbox" />
                <span>Register with embassy/consulate if traveling long-term</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelHealth;