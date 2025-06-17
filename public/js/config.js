// API Configuration
const API_CONFIG = {
    // Use environment variable or fallback to localhost for development
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api'
        : 'https://auto-universe-api.onrender.com/api'
};

// Export for use in other files
window.API_CONFIG = API_CONFIG;
