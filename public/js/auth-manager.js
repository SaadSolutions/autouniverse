// Auth utility for frontend token management
// This can be included in any page that needs authentication

class AuthManager {
    constructor() {
    this.API_BASE_URL = 'https://autouniverse-1.onrender.com/api';
        this.accessToken = localStorage.getItem('authToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.tokenRefreshTimer = null;
        this.isRefreshing = false;
        this.failedQueue = [];
        
        // Start token refresh schedule if we have tokens
        if (this.accessToken && this.refreshToken) {
            this.scheduleTokenRefresh();
        }
    }

    // Make authenticated API calls with automatic token refresh
    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (this.accessToken) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                // Handle token expiration
                if (data.code === 'TOKEN_EXPIRED' && this.refreshToken) {
                    console.log('Access token expired, attempting refresh...');
                    
                    // If we're already refreshing, queue this request
                    if (this.isRefreshing) {
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject, url, config });
                        });
                    }
                    
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        // Retry the original request with new token
                        config.headers.Authorization = `Bearer ${this.accessToken}`;
                        const retryResponse = await fetch(url, config);
                        const retryData = await retryResponse.json();
                        
                        if (!retryResponse.ok) {
                            throw new Error(retryData.message || 'API call failed after token refresh');
                        }
                        
                        return retryData;
                    } else {
                        // Refresh failed, handle auth failure
                        this.handleAuthFailure();
                        throw new Error('Session expired. Please login again.');
                    }
                }
                
                throw new Error(data.message || 'API call failed');
            }
            
            return data;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken || this.isRefreshing) {
            return false;
        }
        
        this.isRefreshing = true;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Token refresh failed:', data.message);
                return false;
            }
            
            // Update tokens
            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            
            // Store in localStorage
            localStorage.setItem('authToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Process queued requests
            this.processQueue(null);
            
            // Schedule next refresh
            this.scheduleTokenRefresh();
            
            console.log('Token refreshed successfully');
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            this.processQueue(error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    // Process queued requests after token refresh
    processQueue(error) {
        this.failedQueue.forEach(({ resolve, reject, url, config }) => {
            if (error) {
                reject(error);
            } else {
                // Retry the request with new token
                config.headers.Authorization = `Bearer ${this.accessToken}`;
                fetch(url, config)
                    .then(response => response.json())
                    .then(data => {
                        if (!response.ok) {
                            reject(new Error(data.message || 'API call failed'));
                        } else {
                            resolve(data);
                        }
                    })
                    .catch(reject);
            }
        });
        
        this.failedQueue = [];
    }

    // Schedule automatic token refresh
    scheduleTokenRefresh() {
        // Clear existing timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }
        
        // JWT access tokens expire in 15 minutes, refresh at 14 minutes
        const refreshInterval = 14 * 60 * 1000; // 14 minutes in milliseconds
        
        this.tokenRefreshTimer = setTimeout(async () => {
            console.log('Attempting scheduled token refresh...');
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                this.handleAuthFailure();
            }
        }, refreshInterval);
    }

    // Handle authentication failure
    handleAuthFailure() {
        // Clear tokens
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        
        // Clear refresh timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
        
        // Show notification if function exists
        if (typeof showNotification === 'function') {
            showNotification('Session expired. Please login again.', 'error');
        }
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'dashboard.html';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.accessToken && this.refreshToken);
    }

    // Get current tokens
    getTokens() {
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken
        };
    }

    // Set tokens (for login)
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        this.scheduleTokenRefresh();
    }

    // Clear tokens (for logout)
    async clearTokens() {
        try {
            // Attempt to logout on server
            if (this.refreshToken) {
                await fetch(`${this.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken: this.refreshToken })
                });
            }
        } catch (error) {
            console.error('Server logout error:', error);
        }
        
        // Clear client-side tokens
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        
        // Clear refresh timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
