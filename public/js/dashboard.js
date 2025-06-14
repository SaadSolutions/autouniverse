// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Global state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

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

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    if (authToken) {
        try {
            await verifyToken();
            showDashboard();
            loadDashboardData();
        } catch (error) {
            showLogin();
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
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API call failed');
    }
    
    return data;
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
    
    authToken = data.token;
    currentUser = data.dealer;
    localStorage.setItem('authToken', authToken);
    
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

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
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
        
        await addCar(formData);
        
        // Success
        alert('Car added successfully!');
        e.target.reset();
        showTab('cars');
        loadCars(); // Refresh cars list
        
    } catch (error) {
        console.error('Add car error:', error);
        alert('Failed to add car: ' + error.message);
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
function getStatusColor(status) {
    const colors = {
        available: 'bg-green-100 text-green-800',
        sold: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        draft: 'bg-blue-100 text-blue-800',
        approved: 'bg-green-100 text-green-800',
        denied: 'bg-red-100 text-red-800',
        under_review: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Car management functions (placeholders)
function editCar(carId) {
    alert('Edit functionality coming soon!');
}

async function deleteCar(carId) {
    if (confirm('Are you sure you want to delete this car?')) {
        try {
            await apiCall(`/cars/${carId}`, { method: 'DELETE' });
            alert('Car deleted successfully!');
            loadCars();
            loadDashboardStats();
        } catch (error) {
            alert('Failed to delete car: ' + error.message);
        }
    }
}

function viewApplication(appId) {
    alert('Application details coming soon!');
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
