/**
 * Extension Configuration
 * Centralized configuration for backend and frontend URLs
 */

const CONFIG = {
  // Backend API configuration
  backend: {
    url: 'https://xlr8-parla-backend-production.up.railway.app',
    endpoints: {
      profile: '/api/users/profile/',
      translate: '/api/phrases/translate/',
      phrases: '/api/phrases/phrases/',
    }
  },
  
  // Frontend configuration
  frontend: {
    url: 'https://parla-frontend.vercel.app/',
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
