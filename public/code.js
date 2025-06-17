// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Sample Car Data (fallback if API fails)

let allCars = [];
let currentCars = [];

// Load cars from API
async function loadCarsFromAPI() {
    try {
        console.log('Loading cars from API:', `${API_BASE_URL}/cars`);
        const response = await fetch(`${API_BASE_URL}/cars`);
        const data = await response.json();
        
        console.log('API Response:', { status: response.status, ok: response.ok, data });
        
        if (response.ok && data.cars) {
            allCars = data.cars.map(car => ({
                id: car._id,
                make: car.make,
                model: car.model,
                year: car.year,
                mileage: `${car.mileage.toLocaleString()} miles`,
                price: car.price,
                bodyStyle: car.bodyStyle,
                fuelType: car.fuelType,
                imageUrl: car.images && car.images.length > 0 ? 
                    `${API_BASE_URL.replace('/api', '')}${car.images.find(img => img.isPrimary)?.url || car.images[0].url}` : 
                    `https://placehold.co/600x400/555/FFF?text=${car.make}+${car.model}`,
                description: car.description || `${car.year} ${car.make} ${car.model}`
            }));
            console.log('Successfully loaded', allCars.length, 'cars from API');
        } else {
            throw new Error(`API Error: ${response.status} - ${data.message || 'Failed to load cars'}`);
        }
    } catch (error) {
        console.error('Failed to load cars from API, using fallback data:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            apiUrl: `${API_BASE_URL}/cars`
        });
        allCars = fallbackCars;
    }
    
    currentCars = [...allCars];
    
    // Render cars if we're on the inventory page
    if (document.getElementById('carListings')) {
        renderCarCards(currentCars);
    }
}

// Function to render car cards
function renderCarCards(carsToRender) {
    const carListingsContainer = document.getElementById('carListings');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    if (!carListingsContainer) return; // Exit if not on inventory page
    
    carListingsContainer.innerHTML = ''; // Clear existing cards

    if (carsToRender.length === 0) {
        noResultsMessage.classList.remove('hidden');
    } else {
        noResultsMessage.classList.add('hidden');
        carsToRender.forEach(car => {
            const card = `
                <div class="car-card rounded-lg shadow-lg overflow-hidden flex flex-col">
                    <a href="car-detail.html?id=${car.id}" class="block">
                        <img src="${car.imageUrl}" alt="${car.make} ${car.model}" class="w-full h-48 object-cover">
                    </a>
                    <div class="p-4 flex flex-col flex-grow">
                        <div class="flex justify-between items-start mb-2">
                            <a href="car-detail.html?id=${car.id}" class="block">
                             <h3 class="text-lg font-semibold text-gray-800 hover:text-red-600 transition duration-300">${car.year} ${car.make} ${car.model}</h3>
                            </a>
                            <div class="heart-icon" onclick="toggleFavorite(this, '${car.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                </svg>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">${car.mileage}</p>
                        <p class="text-xs text-gray-600 mb-3 flex-grow">${car.description.substring(0, 70)}...</p>
                        <a href="car-detail.html?id=${car.id}" class="mt-auto block w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300">
                            View Details
                        </a>
                    </div>
                </div>
            `;
            carListingsContainer.innerHTML += card;
        });
    }
}

// Function to apply filters
function applyFilters() {
    const makeFilter = document.getElementById('makeFilter').value.toLowerCase();
    const modelFilter = document.getElementById('modelFilter').value.toLowerCase();
    const bodyStyleFilter = document.getElementById('bodyStyleFilter').value;
    const fuelTypeFilter = document.getElementById('fuelTypeFilter').value;

    currentCars = allCars.filter(car => {
        const matchesMake = makeFilter ? car.make.toLowerCase().includes(makeFilter) : true;
        const matchesModel = modelFilter ? car.model.toLowerCase().includes(modelFilter) : true;
        const matchesBodyStyle = bodyStyleFilter ? car.bodyStyle === bodyStyleFilter : true;
        const matchesFuelType = fuelTypeFilter ? car.fuelType === fuelTypeFilter : true;
        return matchesMake && matchesModel && matchesBodyStyle && matchesFuelType;
    });
    renderCarCards(currentCars);
}

// Function to reset filters
function resetFilters() {
    document.getElementById('filterForm').reset();
    currentCars = [...allCars];
    renderCarCards(currentCars);
}

// Function to toggle favorite status (visual only for now)
function toggleFavorite(heartIconElement, carId) {
    heartIconElement.classList.toggle('favorited');
    // In a real app, you'd save this preference
    console.log(`Toggled favorite for car ID: ${carId}, new status: ${heartIconElement.classList.contains('favorited')}`);
}

// Initial setup: Load cars when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load cars from API
    loadCarsFromAPI();
});