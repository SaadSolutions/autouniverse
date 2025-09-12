// Configuration
const API_BASE_URL = 'https://autouniverse.onrender.com/api';

// Global state
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let refreshToken = localStorage.getItem('refreshToken');
let tokenRefreshTimer = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const dealerName = document.getElementById('dealerName');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const addCarForm = document.getElementById('addCarForm');

// Utility functions
function getStatusColor(status) {
    const statusColors = {
        'available': 'bg-green-100 text-green-800',
        'sold': 'bg-red-100 text-red-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'under_review': 'bg-blue-100 text-blue-800',
        'approved': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'in_progress': 'bg-yellow-100 text-yellow-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
}

function addCustomFeature(featureText) {
    const featuresContainer = document.querySelector('div[class*="grid-cols-2 md:grid-cols-3"]');
    if (featuresContainer) {
        const label = document.createElement('label');
        label.className = 'flex items-center';
        label.innerHTML = `
            <input type="checkbox" name="features" value="${featureText}" class="mr-2" checked>
            ${featureText}
            <button type="button" onclick="this.parentElement.remove()" class="ml-2 text-red-500 hover:text-red-700 text-sm">×</button>
        `;
        featuresContainer.appendChild(label);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    if (authToken && refreshToken) {
        try {
            await verifyToken();
            showDashboard();
            loadDashboardData();
            // Schedule token refresh
            scheduleTokenRefresh();
        } catch (error) {
            console.error('Token verification failed:', error);
            // Try to refresh the token
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                try {
                    await verifyToken();
                    showDashboard();
                    loadDashboardData();
                } catch (verifyError) {
                    handleAuthFailure();
                }
            } else {
                handleAuthFailure();
            }
        }
    } else if (refreshToken) {
        // We have refresh token but no access token, try to refresh
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            try {
                await verifyToken();
                showDashboard();
                loadDashboardData();
            } catch (error) {
                handleAuthFailure();
            }
        } else {
            handleAuthFailure();
        }
    } else {
        showLogin();
    }
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Add car form
    addCarForm.addEventListener('submit', handleAddCar);
    
    // Add car button
    document.getElementById('addCarBtn').addEventListener('click', () => {
        showTab('add-car');
    });
    
    // Cancel add car
    document.getElementById('cancelAddCar').addEventListener('click', () => {
        showTab('cars');
        addCarForm.reset();
    });
    
    // Custom feature input handler
    const customFeatureInput = document.getElementById('customFeature');
    if (customFeatureInput) {
        customFeatureInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const featureText = this.value.trim();
                if (featureText) {
                    addCustomFeature(featureText);
                    this.value = '';
                }
            }
        });
    }

    // VIN input formatting
    const vinInput = document.querySelector('input[name="vin"]');
    if (vinInput) {
        vinInput.addEventListener('input', function(e) {
            // Convert to uppercase and remove invalid characters
            this.value = this.value.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
        });
    }
}

// API Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            // Handle token expiration
            if (data.code === 'TOKEN_EXPIRED' && refreshToken) {
                console.log('Access token expired, attempting refresh...');
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    // Retry the original request with new token
                    config.headers.Authorization = `Bearer ${authToken}`;
                    const retryResponse = await fetch(url, config);
                    const retryData = await retryResponse.json();
                    
                    if (!retryResponse.ok) {
                        throw new Error(retryData.message || 'API call failed after token refresh');
                    }
                    
                    return retryData;
                } else {
                    // Refresh failed, redirect to login
                    handleAuthFailure();
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

async function refreshAccessToken() {
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Token refresh failed:', data.message);
            return false;
        }
        
        // Update tokens
        authToken = data.accessToken;
        refreshToken = data.refreshToken;
        
        // Store in localStorage
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Schedule next refresh
        scheduleTokenRefresh();
        
        console.log('Token refreshed successfully');
        return true;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

function scheduleTokenRefresh() {
    // Clear existing timer
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
    }
    
    // JWT access tokens expire in 15 minutes, refresh at 14 minutes
    const refreshInterval = 14 * 60 * 1000; // 14 minutes in milliseconds
    
    tokenRefreshTimer = setTimeout(async () => {
        console.log('Attempting scheduled token refresh...');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            handleAuthFailure();
        }
    }, refreshInterval);
}

function handleAuthFailure() {
    // Clear tokens
    authToken = null;
    refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Clear refresh timer
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
    
    // Show login
    showLogin();
    
    // Show notification
    showNotification('Session expired. Please login again.', 'error');
}

async function verifyToken() {
    const data = await apiCall('/auth/verify');
    currentUser = data.dealer;
    return data;
}

async function login(email, password) {
    const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    // Store both tokens
    authToken = data.accessToken;
    refreshToken = data.refreshToken;
    currentUser = data.dealer;
    
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Schedule token refresh
    scheduleTokenRefresh();
    
    return data;
}

async function getCars() {
    return await apiCall('/cars/dealer');
}

async function addCar(formData) {
    return await apiCall('/cars', {
        method: 'POST',
        headers: {}, // Remove Content-Type to let browser set it for FormData
        body: formData
    });
}

async function getApplications() {
    return await apiCall('/forms/loan-applications');
}

// Delete car function
async function deleteCar(carId) {
    if (!confirm('Are you sure you want to delete this car? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiCall(`/cars/${carId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Car deleted successfully!', 'success');
            loadCars(); // Refresh the cars list
            loadDashboardStats(); // Refresh stats
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete car');
        }
    } catch (error) {
        console.error('Delete car error:', error);
        showNotification(`Failed to delete car: ${error.message}`, 'error');
    }
}

// Event Handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.login-btn-text');
    const spinner = submitBtn.querySelector('.login-spinner');
    const errorDiv = document.getElementById('loginError');
    
    try {
        // Show loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;
        errorDiv.classList.add('hidden');
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        await login(email, password);
        
        showDashboard();
        loadDashboardData();
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        // Attempt to logout on server (remove refresh token)
        if (refreshToken) {
            await apiCall('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Continue with client-side logout even if server logout fails
    }
    
    // Clear client-side data
    authToken = null;
    refreshToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Clear refresh timer
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
    
    showLogin();
}

function handleNavigation(e) {
    e.preventDefault();
    const tab = e.target.closest('.nav-link').dataset.tab;
    showTab(tab);
    
    // Update active nav item
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-red-600');
        link.classList.add('hover:bg-gray-700');
    });
    e.target.closest('.nav-link').classList.add('bg-red-600');
    e.target.closest('.nav-link').classList.remove('hover:bg-gray-700');
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

async function handleAddCar(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.add-car-btn-text');
    const spinner = submitBtn.querySelector('.add-car-spinner');
    
    try {
        // Show loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;
        
        const formData = new FormData(e.target);
        
        // Handle features array properly
        const features = [];
        const featureCheckboxes = e.target.querySelectorAll('input[name="features"]:checked');
        featureCheckboxes.forEach(checkbox => {
            features.push(checkbox.value);
        });
        
        // Remove existing features from FormData and add as array
        formData.delete('features');
        features.forEach(feature => {
            formData.append('features', feature);
        });
        
        await addCar(formData);
        
        // Success
        alert('Car added successfully!');
        e.target.reset();
        // Remove any custom features that were added
        const customFeatureLabels = e.target.querySelectorAll('label:has(button[onclick*="remove"])');
        customFeatureLabels.forEach(label => label.remove());
        showTab('cars');
        loadCars(); // Refresh cars list
        
    } catch (error) {
        console.error('Add car error:', error);
        
        // Try to get more specific error information
        let errorMessage = 'Failed to add car';
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        // If it's a validation error, show specific fields
        if (error.message && error.message.includes('Validation Error')) {
            console.log('This is a validation error - check the console for details');
        }
        
        alert(errorMessage);
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

// UI Functions
function showLogin() {
    loginModal.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginModal.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    if (currentUser) {
        dealerName.textContent = currentUser.name;
    }
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Load tab-specific data
    switch(tabName) {
        case 'cars':
            loadCars();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'overview':
            loadDashboardStats();
            break;
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

// Data Loading Functions
async function loadDashboardData() {
    showTab('overview');
    await Promise.all([
        loadDashboardStats(),
        loadCars(),
        loadApplications()
    ]);
}

async function loadDashboardStats() {
    try {
        const [carsData, appsData] = await Promise.all([
            getCars(),
            getApplications()
        ]);
        
        const totalCars = carsData.pagination.total;
        const availableCars = carsData.cars.filter(car => car.status === 'available').length;
        const totalApplications = appsData.pagination.total;
        
        document.getElementById('totalCars').textContent = totalCars;
        document.getElementById('availableCars').textContent = availableCars;
        document.getElementById('totalApplications').textContent = totalApplications;
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

async function loadCars() {
    try {
        const data = await getCars();
        renderCarsTable(data.cars);
    } catch (error) {
        console.error('Failed to load cars:', error);
        document.getElementById('carsTable').innerHTML = '<p class="p-4 text-red-600">Failed to load cars</p>';
    }
}

async function loadApplications() {
    try {
        const data = await getApplications();
        renderApplicationsTable(data.applications);
    } catch (error) {
        console.error('Failed to load applications:', error);
        document.getElementById('applicationsTable').innerHTML = '<p class="p-4 text-red-600">Failed to load applications</p>';
    }
}

// Render Functions
function renderCarsTable(cars) {
    const tableHTML = `
        <table class="min-w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                ${cars.map(car => `
                    <tr>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                ${car.primaryImage ? `
                                    <img src="${API_BASE_URL.replace('/api', '')}${car.primaryImage.url}" 
                                         alt="${car.displayName}" 
                                         class="w-12 h-12 rounded-lg object-cover mr-3">
                                ` : `
                                    <div class="w-12 h-12 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                                        <i class="fas fa-car text-gray-400"></i>
                                    </div>
                                `}
                                <div>
                                    <div class="font-medium text-gray-900">${car.year} ${car.make} ${car.model}</div>
                                    <div class="text-sm text-gray-500">${car.bodyStyle} • ${car.fuelType}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-900">$${car.price.toLocaleString()}</td>
                        <td class="px-6 py-4 text-sm text-gray-900">${car.mileage.toLocaleString()} mi</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(car.status)}">
                                ${car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">${new Date(car.createdAt).toLocaleDateString()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button onclick="editCar('${car._id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCar('${car._id}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${cars.length === 0 ? '<p class="p-4 text-gray-500 text-center">No cars added yet. <a href="#" onclick="showTab(\'add-car\')" class="text-red-600">Add your first car</a></p>' : ''}
    `;
    
    document.getElementById('carsTable').innerHTML = tableHTML;
}

function renderApplicationsTable(applications) {
    const tableHTML = `
        <table class="min-w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                ${applications.map(app => `
                    <tr>
                        <td class="px-6 py-4">
                            <div class="font-medium text-gray-900">${app.fullName}</div>
                            <div class="text-sm text-gray-500">${app.email}</div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-900">$${app.desiredLoanAmount.toLocaleString()}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(app.status)}">
                                ${app.status.replace('_', ' ').charAt(0).toUpperCase() + app.status.replace('_', ' ').slice(1)}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">${new Date(app.createdAt).toLocaleDateString()}</td>
                        <td class="px-6 py-4 text-sm">
                            <button onclick="viewApplication('${app._id}')" class="text-blue-600 hover:text-blue-900">
                                <i class="fas fa-eye mr-1"></i>View
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${applications.length === 0 ? '<p class="p-4 text-gray-500 text-center">No applications received yet.</p>' : ''}
    `;
    
    document.getElementById('applicationsTable').innerHTML = tableHTML;
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out translate-x-full`;
    
    // Set colors based on type
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Handle responsive sidebar
window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
});
