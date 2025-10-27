// Kiosk Mode JavaScript
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5050/api' : '/api';
let currentView = 'week';
let currentTheme = localStorage.getItem('theme') || 'light';
let currentDayOffset = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    setupModalListeners();
    loadData();
    setInterval(loadData, 5 * 60 * 1000);
});

function initializeTheme() {
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').textContent = '☀️ Light Mode';
    }
}

function setupEventListeners() {
    document.getElementById('viewToggle').addEventListener('click', toggleView);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('prevDay').addEventListener('click', () => navigateDay(-1));
    document.getElementById('nextDay').addEventListener('click', () => navigateDay(1));
    document.getElementById('returnToday').addEventListener('click', returnToToday);
}

function setupModalListeners() {
    const modal = document.getElementById('mealModal');
    const closeBtn = document.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('show')) closeModal(); });
}

function toggleView() {
    const viewToggleBtn = document.getElementById('viewToggle');
    const weekView = document.getElementById('weekView');
    const singleDayView = document.getElementById('singleDayView');
    if (currentView === 'week') {
        currentView = 'day';
        currentDayOffset = 0;
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

function loadData() {
    if (currentView === 'week') loadWeekMeals();
    else loadTodayMeal();
}

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
        
        let mealContent = '';
        if (meal.main_dish) {
            mealContent = `<div class="meal-name clickable">${escapeHtml(meal.main_dish.name)}`;
            if (meal.side_dishes && meal.side_dishes.length > 0) {
                mealContent += `<div class="sides-preview">${meal.side_dishes.map(s => escapeHtml(s.name)).join(', ')}</div>`;
            }
            mealContent += `</div>`;
        } else {
            mealContent = '<span class="no-meal">No meal planned</span>';
        }
        
        dayCard.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-date">${formatDate(meal.date)}</div>
            ${mealContent}
        `;
        
        if (meal.main_dish) {
            const mealNameDiv = dayCard.querySelector('.meal-name');
            mealNameDiv.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A') showMealModal(meal);
            });
        }
        weekGrid.appendChild(dayCard);
    });
}

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

function navigateDay(direction) {
    currentDayOffset += direction;
    loadTodayMeal();
    updateReturnTodayButton();
}

function returnToToday() {
    currentDayOffset = 0;
    loadTodayMeal();
    updateReturnTodayButton();
}

function updateReturnTodayButton() {
    const returnBtn = document.getElementById('returnToday');
    returnBtn.style.display = currentDayOffset === 0 ? 'none' : 'inline-block';
}

function displayTodayMeal(meal, date) {
    const todayDayName = document.getElementById('todayDayName');
    const todayDate = document.getElementById('todayDate');
    const todayMeal = document.getElementById('todayMeal');
    const targetDate = new Date(date + 'T00:00:00');
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = getTodayDateString();
    let dayLabel = daysOfWeek[targetDate.getDay()];
    if (date === today) dayLabel = 'Today';
    else if (currentDayOffset === -1) dayLabel = 'Yesterday';
    else if (currentDayOffset === 1) dayLabel = 'Tomorrow';
    
    todayDayName.textContent = dayLabel;
    todayDate.textContent = formatDate(date);
    
    if (meal && meal.main_dish) {
        let content = `<div class="main-dish-name">${escapeHtml(meal.main_dish.name)}</div>`;
        if (meal.side_dishes && meal.side_dishes.length > 0) {
            content += `<div class="sides-list"><strong>Sides:</strong> ${meal.side_dishes.map(s => escapeHtml(s.name)).join(', ')}</div>`;
        }
        todayMeal.innerHTML = content;
        todayMeal.className = 'meal-content clickable';
        todayMeal.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A') showMealModal(meal);
        });
    } else {
        todayMeal.innerHTML = '<span class="no-meal">No meal planned for this day</span>';
        todayMeal.className = 'meal-content';
    }
    updateReturnTodayButton();
}

function showMealModal(meal) {
    const modal = document.getElementById('mealModal');
    document.getElementById('modalMealName').textContent = meal.main_dish?.name || 'Unknown Meal';
    document.getElementById('modalMealDate').textContent = formatDate(meal.date);
    
    const setField = (id, value) => {
        const el = document.getElementById(id);
        if (value) {
            el.textContent = value;
            el.classList.remove('empty');
        } else {
            el.textContent = 'Not specified';
            el.classList.add('empty');
        }
    };
    
    setField('modalNationality', meal.main_dish?.nationality);
    setField('modalMainComponent', meal.main_dish?.main_component);
    setField('modalSecondaryComponent', meal.main_dish?.base_component);
    
    const recipeEl = document.getElementById('modalRecipeLocation');
    const recipeRow = document.getElementById('modalRecipeRow');
    if (meal.main_dish?.recipe_location) {
        if (isValidUrl(meal.main_dish.recipe_location)) {
            recipeEl.innerHTML = `<a href="${escapeHtml(meal.main_dish.recipe_location)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meal.main_dish.recipe_location)}</a>`;
        } else {
            recipeEl.textContent = meal.main_dish.recipe_location;
        }
        recipeEl.classList.remove('empty');
        recipeRow.style.display = 'flex';
    } else {
        recipeEl.textContent = 'Not specified';
        recipeEl.classList.add('empty');
        recipeRow.style.display = 'flex';
    }
    
    // Show side dishes
    const sidesEl = document.getElementById('modalSideDishes');
    const sidesRow = document.getElementById('modalSideDishesRow');
    if (meal.side_dishes && meal.side_dishes.length > 0) {
        sidesEl.textContent = meal.side_dishes.map(s => s.name).join(', ');
        sidesEl.classList.remove('empty');
        sidesRow.style.display = 'flex';
    } else {
        sidesEl.textContent = 'None';
        sidesEl.classList.add('empty');
        sidesRow.style.display = 'flex';
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('mealModal').classList.remove('show');
    document.body.style.overflow = '';
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTargetDate(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    const now = new Date();
    lastUpdated.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
