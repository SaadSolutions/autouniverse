// Car Detail Page JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

let currentCar = null;

// Get car ID from URL parameters
function getCarIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load car details from API
async function loadCarDetails(carId) {
    try {
        console.log('Loading car details for ID:', carId);
        const response = await fetch(`${API_BASE_URL}/cars/${carId}`);
        const data = await response.json();
        
        if (response.ok && data.car) {
            currentCar = data.car;
            displayCarDetails(currentCar);
            loadSimilarVehicles(currentCar);
        } else {
            throw new Error(`API Error: ${response.status} - ${data.message || 'Car not found'}`);
        }
    } catch (error) {
        console.error('Failed to load car details:', error);
        showErrorState();
    }
}

// Display car details on the page
function displayCarDetails(car) {
    // Hide loading state and show content
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('carDetailContent').classList.remove('hidden');

    // Update page title
    document.title = `${car.year} ${car.make} ${car.model} - Auto Universe Inc.`;
    
    // Breadcrumb
    document.getElementById('breadcrumbCarName').textContent = `${car.year} ${car.make} ${car.model}`;
    
    // Main car information
    document.getElementById('carTitle').textContent = `${car.year} ${car.make} ${car.model}`;
    document.getElementById('carViews').querySelector('.views-count').textContent = car.views || 0;
    
    // Condition badge
    const conditionElement = document.getElementById('carCondition');
    conditionElement.textContent = car.condition || 'Good';
    conditionElement.className = `px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(car.condition)}`;
    
    // Vehicle details
    document.getElementById('detailYear').textContent = car.year;
    document.getElementById('detailMileage').textContent = `${car.mileage.toLocaleString()} miles`;
    document.getElementById('detailBodyStyle').textContent = car.bodyStyle;
    document.getElementById('detailFuelType').textContent = car.fuelType;
    document.getElementById('detailTransmission').textContent = car.transmission || 'N/A';
    document.getElementById('detailDrivetrain').textContent = car.drivetrain || 'N/A';
    document.getElementById('detailEngine').textContent = car.engine || 'N/A';
    document.getElementById('detailExteriorColor').textContent = car.exteriorColor || 'N/A';
    document.getElementById('detailInteriorColor').textContent = car.interiorColor || 'N/A';
    document.getElementById('detailVin').textContent = car.vin || 'N/A';
    
    // Images
    displayImages(car.images);
    
    // Features
    if (car.features && car.features.length > 0) {
        displayFeatures(car.features);
    }
    
    // Description
    if (car.description) {
        displayDescription(car.description);
    }
}

// Display car images
function displayImages(images) {
    const mainImageElement = document.getElementById('mainImage');
    const thumbnailGallery = document.getElementById('thumbnailGallery');
    
    if (!images || images.length === 0) {
        // Use placeholder if no images
        const placeholderUrl = `https://placehold.co/600x400/555/FFF?text=${currentCar.make}+${currentCar.model}`;
        mainImageElement.src = placeholderUrl;
        mainImageElement.alt = `${currentCar.year} ${currentCar.make} ${currentCar.model}`;
        return;
    }
    
    // Display primary image or first image
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    const imageUrl = `${API_BASE_URL.replace('/api', '')}${primaryImage.url}`;
    mainImageElement.src = imageUrl;
    mainImageElement.alt = `${currentCar.year} ${currentCar.make} ${currentCar.model}`;
    
    // Clear existing thumbnails
    thumbnailGallery.innerHTML = '';
    
    // Create thumbnails for all images
    images.forEach((image, index) => {
        const thumbnailUrl = `${API_BASE_URL.replace('/api', '')}${image.url}`;
        const thumbnail = document.createElement('img');
        thumbnail.src = thumbnailUrl;
        thumbnail.alt = `${currentCar.year} ${currentCar.make} ${currentCar.model} - Image ${index + 1}`;
        thumbnail.className = `w-full h-20 object-cover rounded cursor-pointer border-2 ${image.isPrimary ? 'border-red-600' : 'border-gray-200'} hover:border-red-400 transition duration-300`;
        
        thumbnail.onclick = () => {
            mainImageElement.src = thumbnailUrl;
            // Update border on thumbnails
            thumbnailGallery.querySelectorAll('img').forEach(thumb => {
                thumb.className = thumb.className.replace('border-red-600', 'border-gray-200');
            });
            thumbnail.className = thumbnail.className.replace('border-gray-200', 'border-red-600');
        };
        
        thumbnailGallery.appendChild(thumbnail);
    });
}

// Display features
function displayFeatures(features) {
    const featuresSection = document.getElementById('featuresSection');
    const featuresList = document.getElementById('featuresList');
    
    featuresSection.classList.remove('hidden');
    featuresList.innerHTML = '';
    
    features.forEach(feature => {
        const featureElement = document.createElement('div');
        featureElement.className = 'flex items-center';
        featureElement.innerHTML = `
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
            <span>${feature}</span>
        `;
        featuresList.appendChild(featureElement);
    });
}

// Display description
function displayDescription(description) {
    const descriptionSection = document.getElementById('descriptionSection');
    const descriptionElement = document.getElementById('carDescription');
    
    descriptionSection.classList.remove('hidden');
    descriptionElement.textContent = description;
}

// Get condition color class
function getConditionColor(condition) {
    switch (condition) {
        case 'Excellent':
            return 'bg-green-100 text-green-800';
        case 'Good':
            return 'bg-blue-100 text-blue-800';
        case 'Fair':
            return 'bg-yellow-100 text-yellow-800';
        case 'Poor':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Show error state
function showErrorState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
}

// Increment view count
async function incrementViewCount(carId) {
    try {
        await fetch(`${API_BASE_URL}/cars/${carId}/view`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to increment view count:', error);
    }
}

// Load similar vehicles
async function loadSimilarVehicles(car) {
    try {
        const response = await fetch(`${API_BASE_URL}/cars?make=${car.make}&bodyStyle=${car.bodyStyle}&limit=3`);
        const data = await response.json();
        
        if (response.ok && data.cars) {
            // Filter out current car and display similar ones
            const similarCars = data.cars.filter(c => c._id !== car._id).slice(0, 3);
            displaySimilarVehicles(similarCars);
        }
    } catch (error) {
        console.error('Failed to load similar vehicles:', error);
    }
}

// Display similar vehicles
function displaySimilarVehicles(cars) {
    const similarVehiclesContainer = document.getElementById('similarVehicles');
    
    if (cars.length === 0) {
        similarVehiclesContainer.innerHTML = '<p class="text-gray-600 col-span-full text-center">No similar vehicles found.</p>';
        return;
    }
    
    similarVehiclesContainer.innerHTML = '';
    
    cars.forEach(car => {
        const imageUrl = car.images && car.images.length > 0 ? 
            `${API_BASE_URL.replace('/api', '')}${car.images.find(img => img.isPrimary)?.url || car.images[0].url}` : 
            `https://placehold.co/600x400/555/FFF?text=${car.make}+${car.model}`;
            
        const carCard = document.createElement('div');
        carCard.className = 'car-card rounded-lg shadow-lg overflow-hidden flex flex-col';
        carCard.innerHTML = `
            <a href="car-detail.html?id=${car._id}" class="block">
                <img src="${imageUrl}" alt="${car.make} ${car.model}" class="w-full h-48 object-cover">
            </a>
            <div class="p-4 flex flex-col flex-grow">
                <a href="car-detail.html?id=${car._id}" class="block">
                    <h3 class="text-lg font-semibold text-gray-800 hover:text-red-600 transition duration-300">${car.year} ${car.make} ${car.model}</h3>
                </a>
                <p class="text-sm text-gray-600 mb-1">${car.mileage.toLocaleString()} miles</p>
                <p class="text-xl font-bold text-red-600 mb-3">$${car.price.toLocaleString()}</p>
                <a href="car-detail.html?id=${car._id}" class="mt-auto block w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300">
                    View Details
                </a>
            </div>
        `;
        similarVehiclesContainer.appendChild(carCard);
    });
}

// Action functions
function toggleCarFavorite() {
    const favoriteBtn = document.getElementById('favoriteBtn');
    favoriteBtn.classList.toggle('favorited');
    
    if (favoriteBtn.classList.contains('favorited')) {
        favoriteBtn.querySelector('svg').style.fill = '#ef4444';
        favoriteBtn.querySelector('svg').style.stroke = '#ef4444';
    } else {
        favoriteBtn.querySelector('svg').style.fill = 'none';
        favoriteBtn.querySelector('svg').style.stroke = 'currentColor';
    }
    
    console.log(`Toggled favorite for car ID: ${currentCar._id}`);
}

function contactDealer() {
    const phone = '(732) 907-8380';
    const message = `Hi, I'm interested in the ${currentCar.year} ${currentCar.make} ${currentCar.model} listed for $${currentCar.price.toLocaleString()}. Can you provide more information?`;
    
    // Try to open WhatsApp first, then fall back to phone call
    const whatsappUrl = `https://wa.me/17329078380?text=${encodeURIComponent(message)}`;
    
    // Check if on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        window.open(whatsappUrl, '_blank');
    } else {
        // Show contact options modal or direct to phone
        if (confirm(`Contact dealer about this ${currentCar.year} ${currentCar.make} ${currentCar.model}?\n\nCall: ${phone}`)) {
            window.location.href = `tel:${phone.replace(/[^\d]/g, '')}`;
        }
    }
}

function shareVehicle() {
    const url = window.location.href;
    const title = `${currentCar.year} ${currentCar.make} ${currentCar.model} - $${currentCar.price.toLocaleString()}`;
    const text = `Check out this ${title} at Auto Universe Inc.`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Link copied to clipboard!');
        });
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const carId = getCarIdFromURL();
    
    if (carId) {
        loadCarDetails(carId);
    } else {
        showErrorState();
    }
});
