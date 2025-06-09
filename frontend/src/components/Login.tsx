import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import './Login.css';

interface LoginProps {
  onLogin: (user: any) => void;
}

const LoginComponent: React.FC<LoginProps> = ({ onLogin }) => {
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        // Decode the JWT token to get user info
        const token = credentialResponse.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const userInfo = JSON.parse(jsonPayload);
        
        // Create user object compatible with your AuthService
        const user = {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          verified_email: userInfo.email_verified
        };
        
        // Store in AuthService (simplified - you may want to adapt this)
        onLogin(user);
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to CareConnect</h2>
        <p>Sign in with your Google account to get personalized healthcare recommendations</p>
        
        <div className="features">
          <div className="feature">
            <h3>🗺️ Location-Aware</h3>
            <p>Find healthcare providers near you</p>
          </div>
          <div className="feature">
            <h3>🎯 Personalized</h3>
            <p>Recommendations based on your symptoms and profile</p>
          </div>
          <div className="feature">
            <h3>♿ Accessible</h3>
            <p>Accessibility-focused provider matching</p>
          </div>
        </div>

        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <div className="privacy-notice">
          <small>
            By signing in, you agree to our privacy policy. We only access your basic profile information and location data to provide healthcare recommendations.
          </small>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;