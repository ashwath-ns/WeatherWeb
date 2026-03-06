// app.js

const API_BASE_GEO = 'https://geocoding-api.open-meteo.com/v1';
const API_BASE_WEATHER = 'https://api.open-meteo.com/v1';

// Default city if none selected
const DEFAULT_CITY = {
    name: "London",
    latitude: 51.5085,
    longitude: -0.1257
};

// Weather code mapping to Material Symbols and descriptions
const WEATHER_CODES = {
    0: { icon: 'sunny', desc: 'Clear sky' },
    1: { icon: 'partly_cloudy_day', desc: 'Mainly clear' },
    2: { icon: 'partly_cloudy_day', desc: 'Partly cloudy' },
    3: { icon: 'cloud', desc: 'Overcast' },
    45: { icon: 'foggy', desc: 'Fog' },
    48: { icon: 'foggy', desc: 'Depositing rime fog' },
    51: { icon: 'rainy', desc: 'Light drizzle' },
    53: { icon: 'rainy', desc: 'Moderate drizzle' },
    55: { icon: 'rainy', desc: 'Dense drizzle' },
    56: { icon: 'rainy', desc: 'Light freezing drizzle' },
    57: { icon: 'rainy', desc: 'Dense freezing drizzle' },
    61: { icon: 'rainy', desc: 'Slight rain' },
    63: { icon: 'rainy', desc: 'Moderate rain' },
    65: { icon: 'rainy', desc: 'Heavy rain' },
    66: { icon: 'rainy', desc: 'Light freezing rain' },
    67: { icon: 'rainy', desc: 'Heavy freezing rain' },
    71: { icon: 'snowing', desc: 'Slight snow fall' },
    73: { icon: 'snowing', desc: 'Moderate snow fall' },
    75: { icon: 'snowing', desc: 'Heavy snow fall' },
    77: { icon: 'snowing', desc: 'Snow grains' },
    80: { icon: 'rainy', desc: 'Slight rain showers' },
    81: { icon: 'rainy', desc: 'Moderate rain showers' },
    82: { icon: 'rainy', desc: 'Violent rain showers' },
    85: { icon: 'snowing', desc: 'Slight snow showers' },
    86: { icon: 'snowing', desc: 'Heavy snow showers' },
    95: { icon: 'thunderstorm', desc: 'Thunderstorm' },
    96: { icon: 'thunderstorm', desc: 'Thunderstorm with slight hail' },
    99: { icon: 'thunderstorm', desc: 'Thunderstorm with heavy hail' }
};

class WeatherApp {
    constructor() {
        this.currentCity = this.loadCity();
        this.recentSearches = this.loadRecentSearches();
    }

    // State Management
    loadCity() {
        const stored = localStorage.getItem('weather_current_city');
        return stored ? JSON.parse(stored) : DEFAULT_CITY;
    }

    saveCity(city) {
        this.currentCity = {
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude
        };
        localStorage.setItem('weather_current_city', JSON.stringify(this.currentCity));
        this.addToRecentSearches(this.currentCity);
    }

    loadRecentSearches() {
        const stored = localStorage.getItem('weather_recent_searches');
        if (!stored) return [DEFAULT_CITY];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [DEFAULT_CITY];
        } catch (e) {
            return [DEFAULT_CITY];
        }
    }

    addToRecentSearches(city) {
        // Remove if already exists to move to top
        this.recentSearches = this.recentSearches.filter(c => c.name !== city.name);
        this.recentSearches.unshift(city);
        // Keep only top 5
        if (this.recentSearches.length > 5) {
            this.recentSearches.pop();
        }
        localStorage.setItem('weather_recent_searches', JSON.stringify(this.recentSearches));
    }

    clearRecentSearches() {
        this.recentSearches = [];
        localStorage.setItem('weather_recent_searches', JSON.stringify(this.recentSearches));
    }


    // API Calls
    async searchCity(query) {
        if (!query) return [];
        try {
            const response = await fetch(`${API_BASE_GEO}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error searching city:', error);
            return [];
        }
    }

    async getWeatherData(lat, lon) {
        try {
            const url = `${API_BASE_WEATHER}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            return {
                name: data.address.city || data.address.town || data.address.village || data.address.suburb || "Current Location",
                latitude: lat,
                longitude: lon
            };
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            return { name: "Current Location", latitude: lat, longitude: lon };
        }
    }

    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                (error) => reject(error)
            );
        });
    }

    getWeatherVisuals(code) {
        return WEATHER_CODES[code] || { icon: 'cloud', desc: 'Unknown' };
    }

    updateWeatherAnimation(code, containerId, iconId) {
        const container = document.getElementById(containerId);
        const icon = document.getElementById(iconId);
        if (!container || !icon) return;

        // Clear previous rain
        const oldRain = container.querySelector('.rain-container');
        if (oldRain) oldRain.remove();

        // Reset icon classes
        icon.classList.remove('animate-sun', 'animate-cloud');

        // Apply new animations
        if (code === 0) { // Sunny
            icon.classList.add('animate-sun');
        } else if ([1, 2, 3].includes(code)) { // Cloudy
            icon.classList.add('animate-cloud');
        } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) { // Rainy
            const rainContainer = document.createElement('div');
            rainContainer.className = 'rain-container';
            for (let i = 0; i < 30; i++) {
                const drop = document.createElement('div');
                drop.className = 'drop';
                drop.style.left = Math.random() * 100 + '%';
                drop.style.animationDelay = Math.random() * 2 + 's';
                drop.style.animationDuration = 0.5 + Math.random() * 0.5 + 's';
                rainContainer.appendChild(drop);
            }
            container.appendChild(rainContainer);
        }
    }

    formatDate(dateString, isFullFormat = false) {
        const date = new Date(dateString);
        if (isFullFormat) {
            return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
        }
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
}

const app = new WeatherApp();
