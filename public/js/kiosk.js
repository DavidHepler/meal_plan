// Kiosk Mode JavaScript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5050/api' 
    : '/api';

let currentView = 'week'; // 'week' or 'day'
let currentTheme = localStorage.getItem('theme') || 'light';
let currentDayOffset = 0; // 0 = today, -1 = yesterday, 1 = tomorrow, etc.

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
    document.getElementById('prevDay').addEventListener('click', () => navigateDay(-1));
    document.getElementById('nextDay').addEventListener('click', () => navigateDay(1));
    document.getElementById('returnToday').addEventListener('click', returnToToday);
}

// Toggle between week and day view
function toggleView() {
    const viewToggleBtn = document.getElementById('viewToggle');
    const weekView = document.getElementById('weekView');
    const singleDayView = document.getElementById('singleDayView');
    
    if (currentView === 'week') {
        currentView = 'day';
        currentDayOffset = 0; // Reset to today when switching to day view
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
        const targetDate = getTargetDate(currentDayOffset);
        const response = await fetch(`${API_BASE}/meal-plan/date/${targetDate}`);
        if (!response.ok) throw new Error('Failed to fetch meal');
        
        const meal = await response.json();
        displayTodayMeal(meal, targetDate);
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading meal:', error);
        displayError('todayMeal', 'Failed to load meal');
    }
}

// Navigate to previous or next day
function navigateDay(direction) {
    currentDayOffset += direction;
    loadTodayMeal();
    updateReturnTodayButton();
}

// Return to today
function returnToToday() {
    currentDayOffset = 0;
    loadTodayMeal();
    updateReturnTodayButton();
}

// Update the visibility of the "Return to Today" button
function updateReturnTodayButton() {
    const returnBtn = document.getElementById('returnToday');
    if (currentDayOffset === 0) {
        returnBtn.style.display = 'none';
    } else {
        returnBtn.style.display = 'inline-block';
    }
}

// Display today's meal
function displayTodayMeal(meal, date) {
    const todayDayName = document.getElementById('todayDayName');
    const todayDate = document.getElementById('todayDate');
    const todayMeal = document.getElementById('todayMeal');
    
    const targetDate = new Date(date + 'T00:00:00');
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Determine if it's today, yesterday, tomorrow, or a specific date
    const today = getTodayDateString();
    let dayLabel = daysOfWeek[targetDate.getDay()];
    if (date === today) {
        dayLabel = 'Today';
    } else if (currentDayOffset === -1) {
        dayLabel = 'Yesterday';
    } else if (currentDayOffset === 1) {
        dayLabel = 'Tomorrow';
    }
    
    todayDayName.textContent = dayLabel;
    todayDate.textContent = formatDate(date);
    
    if (meal && meal.name) {
        todayMeal.innerHTML = createMealLink(meal);
    } else {
        todayMeal.innerHTML = '<span class="no-meal">No meal planned for this day</span>';
    }
    
    // Update the return to today button visibility
    updateReturnTodayButton();
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

// Get target date based on offset from today
function getTargetDate(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
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
