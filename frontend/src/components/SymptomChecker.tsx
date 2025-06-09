import React, { useState } from 'react';
import './SymptomChecker.css';
import DatabricksService, { HealthcareRecommendation } from '../services/databricksService';
import LocationService from '../services/locationService';

interface Symptom {
  id: string;
  name: string;
  category: string;
}

interface SymptomSeverity {
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

const SymptomChecker: React.FC = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomSeverity[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<HealthcareRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [description, setDescription] = useState('');

  // Get symptoms from medical databases or use common symptoms as fallback
  const commonSymptoms: Symptom[] = [
    { id: '1', name: 'Headache', category: 'Neurological' },
    { id: '2', name: 'Fever', category: 'General' },
    { id: '3', name: 'Cough', category: 'Respiratory' },
    { id: '4', name: 'Sore Throat', category: 'Respiratory' },
    { id: '5', name: 'Fatigue', category: 'General' },
    { id: '6', name: 'Nausea', category: 'Digestive' },
    { id: '7', name: 'Stomach Pain', category: 'Digestive' },
    { id: '8', name: 'Chest Pain', category: 'Cardiovascular' },
    { id: '9', name: 'Shortness of Breath', category: 'Respiratory' },
    { id: '10', name: 'Dizziness', category: 'Neurological' },
    { id: '11', name: 'Joint Pain', category: 'Musculoskeletal' },
    { id: '12', name: 'Back Pain', category: 'Musculoskeletal' },
    { id: '13', name: 'Vomiting', category: 'Digestive' },
    { id: '14', name: 'Skin Rash', category: 'Dermatological' },
    { id: '15', name: 'Muscle Pain', category: 'Musculoskeletal' },
    { id: '16', name: 'Vision Problems', category: 'Ophthalmological' },
    { id: '17', name: 'Hearing Loss', category: 'Otolaryngological' },
    { id: '18', name: 'Memory Issues', category: 'Neurological' },
    { id: '19', name: 'Numbness', category: 'Neurological' },
    { id: '20', name: 'Heart Palpitations', category: 'Cardiovascular' }
  ];

  const filteredSymptoms = commonSymptoms.filter(symptom =>
    symptom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    symptom.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addSymptom = (symptom: Symptom) => {
    setCurrentSymptom(symptom.name);
    setSearchTerm('');
  };

  const saveSymptom = (severity: 'mild' | 'moderate' | 'severe', duration: string) => {
    if (currentSymptom && duration) {
      const newSymptom: SymptomSeverity = {
        symptom: currentSymptom,
        severity,
        duration
      };
      setSelectedSymptoms([...selectedSymptoms, newSymptom]);
      setCurrentSymptom('');
    }
  };

  const removeSymptom = (index: number) => {
    setSelectedSymptoms(selectedSymptoms.filter((_, i) => i !== index));
  };

  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setShowRecommendations(true);
    setAiRecommendation(null);

    try {
      // Get user's current location
      const location = await LocationService.getCurrentLocation();
      
      // Determine overall severity
      const severities = selectedSymptoms.map(s => s.severity);
      const overallSeverity = severities.includes('severe') ? 'severe' : 
                            severities.includes('moderate') ? 'moderate' : 'mild';

      // Prepare symptom analysis request
      const symptomRequest = {
        symptoms: selectedSymptoms.map(s => s.symptom),
        severity: overallSeverity as 'mild' | 'moderate' | 'severe',
        duration: selectedSymptoms[0]?.duration || 'Not specified',
        description: description || `Patient reports: ${selectedSymptoms.map(s => `${s.symptom} (${s.severity}) for ${s.duration}`).join(', ')}`,
        location: location
      };

      console.log('Sending symptom analysis request:', symptomRequest);

      // Get AI recommendation from Databricks
      const recommendation = await DatabricksService.analyzeSymptoms(symptomRequest);
      
      console.log('Received AI recommendation:', recommendation);
      setAiRecommendation(recommendation);

    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      alert(`Failed to analyze symptoms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return '#dc3545';
      case 'urgent': return '#fd7e14';
      case 'moderate': return '#ffc107';
      case 'routine': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="symptom-checker">
      <div className="symptom-checker-header">
        <h2>🩺 AI Symptom Checker</h2>
        <p className="disclaimer">
          <strong>Disclaimer:</strong> This tool is for informational purposes only and is not a substitute for professional medical advice.
        </p>
      </div>

      <div className="symptom-input-section">
        <h3>What symptoms are you experiencing?</h3>
        
        <div className="description-section">
          <textarea
            placeholder="Describe your symptoms in detail (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="symptom-description"
            rows={3}
          />
        </div>
        
        <div className="symptom-search">
          <input
            type="text"
            placeholder="Search symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="symptom-search-input"
          />
          
          {searchTerm && (
            <div className="symptom-suggestions">
              {filteredSymptoms.map(symptom => (
                <button
                  key={symptom.id}
                  className="symptom-suggestion"
                  onClick={() => addSymptom(symptom)}
                >
                  <span className="symptom-name">{symptom.name}</span>
                  <span className="symptom-category">{symptom.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="common-symptoms">
          <h4>Common Symptoms</h4>
          <div className="symptom-grid">
            {commonSymptoms.slice(0, 8).map(symptom => (
              <button
                key={symptom.id}
                className="symptom-button"
                onClick={() => addSymptom(symptom)}
              >
                {symptom.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {currentSymptom && (
        <div className="symptom-detail-modal">
          <div className="modal-content">
            <h3>Tell us more about: {currentSymptom}</h3>
            
            <div className="severity-section">
              <h4>How severe is it?</h4>
              <div className="severity-options">
                {['mild', 'moderate', 'severe'].map(severity => (
                  <button
                    key={severity}
                    className={`severity-btn severity-${severity}`}
                    onClick={() => {
                      const duration = prompt('How long have you had this symptom? (e.g., "2 days", "1 week")');
                      if (duration) {
                        saveSymptom(severity as 'mild' | 'moderate' | 'severe', duration);
                      }
                    }}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              className="cancel-btn"
              onClick={() => setCurrentSymptom('')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedSymptoms.length > 0 && (
        <div className="selected-symptoms">
          <h3>Your Symptoms</h3>
          <div className="symptom-list">
            {selectedSymptoms.map((symptom, index) => (
              <div key={index} className="symptom-item">
                <div className="symptom-info">
                  <span className="symptom-name">{symptom.symptom}</span>
                  <span className={`severity-badge severity-${symptom.severity}`}>
                    {symptom.severity}
                  </span>
                  <span className="duration">for {symptom.duration}</span>
                </div>
                <button 
                  className="remove-btn"
                  onClick={() => removeSymptom(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <button 
            className="analyze-btn"
            onClick={analyzeSymptoms}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '🤖 Analyzing Symptoms...' : '🩺 Get AI Recommendations'}
          </button>
        </div>
      )}

      {showRecommendations && selectedSymptoms.length > 0 && (
        <div className="recommendations">
          {isAnalyzing && (
            <div className="analyzing-indicator">
              <div className="spinner"></div>
              <p>🤖 AI is analyzing your symptoms using medical knowledge from Databricks...</p>
            </div>
          )}
          
          {aiRecommendation && (
            <div className="recommendation-card" style={{ borderColor: getUrgencyColor(aiRecommendation.urgency) }}>
              <h3 style={{ color: getUrgencyColor(aiRecommendation.urgency) }}>
                AI Medical Recommendation
              </h3>
              
              <div className="recommendation-content">
                <div className="urgency-level" style={{ backgroundColor: getUrgencyColor(aiRecommendation.urgency) }}>
                  {aiRecommendation.urgency.toUpperCase()}
                </div>
                
                <div className="care-type-recommendation">
                  <strong>Recommended Care:</strong> {aiRecommendation.recommendedCareType.replace('_', ' ').toUpperCase()}
                </div>
                
                <div className="confidence-score">
                  <strong>Confidence:</strong> {Math.round(aiRecommendation.confidence * 100)}%
                </div>
                
                <div className="reasoning">
                  <h4>Analysis:</h4>
                  <p>{aiRecommendation.reasoning}</p>
                </div>
                
                <div className="recommendations-list">
                  <h4>Recommendations:</h4>
                  <ul>
                    {aiRecommendation.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="next-steps">
                  <h4>Next Steps:</h4>
                  <ul>
                    {aiRecommendation.next_steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="emergency-warning">
                  <h4>⚠️ Seek Emergency Care If:</h4>
                  <ul>
                    {aiRecommendation.when_to_seek_emergency_care.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
                
                {aiRecommendation.symptoms_analysis && (
                  <div className="symptom-analysis">
                    <h4>Symptom Analysis:</h4>
                    <p><strong>Primary Symptoms:</strong> {aiRecommendation.symptoms_analysis.primary_symptoms.join(', ')}</p>
                    <p><strong>Severity Assessment:</strong> {aiRecommendation.symptoms_analysis.severity_assessment}</p>
                    {aiRecommendation.symptoms_analysis.potential_conditions.length > 0 && (
                      <p><strong>Potential Conditions:</strong> {aiRecommendation.symptoms_analysis.potential_conditions.join(', ')}</p>
                    )}
                    {aiRecommendation.symptoms_analysis.red_flags.length > 0 && (
                      <p><strong>⚠️ Red Flags:</strong> {aiRecommendation.symptoms_analysis.red_flags.join(', ')}</p>
                    )}
                  </div>
                )}
                
                {aiRecommendation.estimated_wait_time && (
                  <div className="wait-time">
                    <strong>Estimated Wait Time:</strong> {aiRecommendation.estimated_wait_time}
                  </div>
                )}
                
                {aiRecommendation.cost_considerations && (
                  <div className="cost-info">
                    <strong>Cost Considerations:</strong> {aiRecommendation.cost_considerations}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;