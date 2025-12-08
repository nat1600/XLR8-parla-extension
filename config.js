/**
 * Extension Configuration
 * Centralized configuration for backend and frontend URLs
 */

const CONFIG = {
  // Backend API configuration
  backend: {
    url: 'http://localhost:8000',
    endpoints: {
      profile: '/api/users/profile/',
      translate: '/api/phrases/translate/',
      phrases: '/api/phrases/phrases/',
    }
  },
  
  // Frontend configuration
  frontend: {
    url: 'http://localhost:8080',
    pages: {
      login: '/login',
      dashboard: '/dashboard',
    }
  },

  // Extension configuration
  extension: {
    authCheckInterval: 2000, // ms - How often to check for auth after login
    authCheckAttempts: 15,   // times - Max attempts to verify auth
    debugMode: true,         // Enable console logging
  }
};

/**
 * Helper function to build backend URL
 */
function getBackendUrl(endpoint) {
  return CONFIG.backend.url + endpoint;
}

/**
 * Helper function to build frontend URL
 */
function getFrontendUrl(page) {
  return CONFIG.frontend.url + page;
}

// Expose globally
window.CONFIG = CONFIG;
window.getBackendUrl = getBackendUrl;
window.getFrontendUrl = getFrontendUrl;
