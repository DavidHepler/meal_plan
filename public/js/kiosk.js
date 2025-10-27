// Kiosk Mode JavaScript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5050/api' 
    : '/api';

let currentView = 'week'; // 'week' or 'day'
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    loadData();
    
    // Auto-refresh every 5 minutes
    setInterval(loadData, 5 * 60 * 1000);
});

// Initialize theme
function initializeTheme() {
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').textContent = '☀️ Light Mode';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('viewToggle').addEventListener('click', toggleView);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

// Toggle between week and day view
function toggleView() {
    const viewToggleBtn = document.getElementById('viewToggle');
    const weekView = document.getElementById('weekView');
    const singleDayView = document.getElementById('singleDayView');
    
    if (currentView === 'week') {
        currentView = 'day';
        weekView.classList.add('hidden');
        singleDayView.classList.remove('hidden');
        viewToggleBtn.textContent = 'Week View';
        loadTodayMeal();
    } else {
        currentView = 'week';
        singleDayView.classList.add('hidden');
        weekView.classList.remove('hidden');
        viewToggleBtn.textContent = "Today's Meal";
        loadWeekMeals();
    }
}

// Toggle theme
function toggleTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    
    if (currentTheme === 'light') {
        currentTheme = 'dark';
        document.body.setAttribute('data-theme', 'dark');
        themeToggleBtn.textContent = '☀️ Light Mode';
    } else {
        currentTheme = 'light';
        document.body.removeAttribute('data-theme');
        themeToggleBtn.textContent = '🌙 Dark Mode';
    }
    
    localStorage.setItem('theme', currentTheme);
}

// Load data based on current view
function loadData() {
    if (currentView === 'week') {
        loadWeekMeals();
    } else {
        loadTodayMeal();
    }
}

// Load week meals
async function loadWeekMeals() {
    try {
        const response = await fetch(`${API_BASE}/meal-plan`);
        if (!response.ok) throw new Error('Failed to fetch meal plan');
        
        const meals = await response.json();
        displayWeekMeals(meals);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading week meals:', error);
        displayError('weekGrid', 'Failed to load meal plan');
    }
}

// Display week meals
function displayWeekMeals(meals) {
    const weekGrid = document.getElementById('weekGrid');
    weekGrid.innerHTML = '';
    
    if (!meals || meals.length === 0) {
        weekGrid.innerHTML = '<p class="loading">No meal plan available</p>';
        return;
    }
    
    const today = getTodayDateString();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    meals.forEach(meal => {
        const date = new Date(meal.date + 'T00:00:00');
        const dayName = daysOfWeek[date.getDay()];
        const isToday = meal.date === today;
        
        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${isToday ? 'today' : ''}`;
        
        dayCard.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-date">${formatDate(meal.date)}</div>
            <div class="meal-name">
                ${meal.name ? createMealLink(meal) : '<span class="no-meal">No meal planned</span>'}
            </div>
        `;
        
        weekGrid.appendChild(dayCard);
    });
}

// Load today's meal
async function loadTodayMeal() {
    try {
        const response = await fetch(`${API_BASE}/meal-plan/today`);
        if (!response.ok) throw new Error('Failed to fetch today\'s meal');
        
        const meal = await response.json();
        displayTodayMeal(meal);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading today\'s meal:', error);
        displayError('todayMeal', 'Failed to load today\'s meal');
    }
}

// Display today's meal
function displayTodayMeal(meal) {
    const todayDayName = document.getElementById('todayDayName');
    const todayDate = document.getElementById('todayDate');
    const todayMeal = document.getElementById('todayMeal');
    
    const now = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    todayDayName.textContent = daysOfWeek[now.getDay()];
    todayDate.textContent = formatDate(getTodayDateString());
    
    if (meal && meal.name) {
        todayMeal.innerHTML = createMealLink(meal);
    } else {
        todayMeal.innerHTML = '<span class="no-meal">No meal planned for today</span>';
    }
}

// Create meal link or plain text
function createMealLink(meal) {
    if (!meal || !meal.name) return '';
    
    if (meal.recipe_location && isValidUrl(meal.recipe_location)) {
        return `<a href="${escapeHtml(meal.recipe_location)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meal.name)}</a>`;
    }
    return escapeHtml(meal.name);
}

// Check if string is a valid URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get today's date string in YYYY-MM-DD format using local timezone
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Update last updated timestamp
function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    const now = new Date();
    lastUpdated.textContent = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Display error message
function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
