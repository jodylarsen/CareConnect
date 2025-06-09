import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import AuthService, { User } from './services/auth';
import LoginComponent from './components/Login';
import Dashboard from './components/Dashboard';
import { GOOGLE_CONFIG } from './config/google';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on app load
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setLoading(true);
      const user = await AuthService.handleCallback(code, state);
      setUser(user);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('OAuth callback failed:', error);
      // Handle error (show message to user)
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Loading CareConnect...</h2>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CONFIG.CLIENT_ID}>
      <div className="App">
        <header className="App-header">
          <h1>CareConnect</h1>
          <p>AI-Powered Travel Health Assistant</p>
        </header>

        <main className="container">
          {user ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <LoginComponent onLogin={handleLogin} />
          )}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;