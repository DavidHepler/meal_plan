// Admin Panel JavaScript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5050/api' 
    : '/api';

let authToken = localStorage.getItem('authToken');
let allMeals = [];
let mealPlanData = [];
let currentEditingMealId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showAdminDashboard();
    }
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!e.target.id) { // Not the logout button
                switchSection(e.target.dataset.section);
            }
        });
    });
    
    // Meal Plan
    document.getElementById('savePlanBtn').addEventListener('click', saveMealPlan);
    
    // Meals Management
    document.getElementById('addMealBtn').addEventListener('click', showMealForm);
    document.getElementById('cancelMealBtn').addEventListener('click', hideMealForm);
    document.getElementById('mealForm').addEventListener('submit', handleMealSubmit);
    
    // History
    document.getElementById('archiveBtn').addEventListener('click', archivePastMeals);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
            throw new Error('Invalid password');
        }
        
        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        
        loginError.classList.add('hidden');
        showAdminDashboard();
    } catch (error) {
        loginError.classList.remove('hidden');
    }
}

// Handle logout
function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('password').value = '';
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadMeals();
    loadMealPlan();
}

// Switch between sections
function switchSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Load data for the section
    if (sectionName === 'meal-plan') {
        loadMealPlan();
    } else if (sectionName === 'meals') {
        loadMeals();
        displayMealsList();
    } else if (sectionName === 'history') {
        loadHistory();
    }
}

// Load all meals
async function loadMeals() {
    try {
        const response = await fetch(`${API_BASE}/meals`);
        if (!response.ok) throw new Error('Failed to fetch meals');
        
        allMeals = await response.json();
        allMeals.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

// Load meal plan (2 weeks)
async function loadMealPlan() {
    try {
        const response = await fetch(`${API_BASE}/meal-plan/admin`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch meal plan');
        
        mealPlanData = await response.json();
        displayMealPlan();
    } catch (error) {
        console.error('Error loading meal plan:', error);
        if (error.message.includes('401')) {
            handleLogout();
        }
    }
}

// Display meal plan with searchable dropdowns
function displayMealPlan() {
    const mealPlanGrid = document.getElementById('mealPlanGrid');
    mealPlanGrid.innerHTML = '';
    
    const today = getTodayDateString();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    mealPlanData.forEach(day => {
        const date = new Date(day.date + 'T00:00:00');
        const dayName = daysOfWeek[date.getDay()];
        const isToday = day.date === today;
        
        const dayCard = document.createElement('div');
        dayCard.className = `plan-day-card ${isToday ? 'today' : ''}`;
        dayCard.dataset.date = day.date;
        
        dayCard.innerHTML = `
            <div class="plan-day-header">
                <span class="plan-day-name">${dayName}</span>
                <span class="plan-day-date">${formatDate(day.date)}</span>
            </div>
            <div class="meal-selector">
                <input type="text" 
                       class="meal-search-input" 
                       placeholder="Search or select meal..."
                       data-date="${day.date}"
                       data-meal-id="${day.meal_id || ''}"
                       value="${day.name || ''}"
                       autocomplete="off">
                <div class="meal-dropdown hidden"></div>
            </div>
        `;
        
        mealPlanGrid.appendChild(dayCard);
        
        // Setup search functionality
        const input = dayCard.querySelector('.meal-search-input');
        const dropdown = dayCard.querySelector('.meal-dropdown');
        
        input.addEventListener('focus', () => {
            showMealDropdown(input, dropdown);
        });
        
        input.addEventListener('input', () => {
            showMealDropdown(input, dropdown);
        });
        
        input.addEventListener('blur', () => {
            // Delay to allow click on dropdown
            setTimeout(() => {
                dropdown.classList.add('hidden');
            }, 200);
        });
    });
}

// Show meal dropdown with search/filter
function showMealDropdown(input, dropdown) {
    const searchTerm = input.value.toLowerCase();
    const filteredMeals = allMeals.filter(meal => 
        meal.name.toLowerCase().includes(searchTerm) ||
        (meal.nationality && meal.nationality.toLowerCase().includes(searchTerm)) ||
        (meal.main_component && meal.main_component.toLowerCase().includes(searchTerm))
    );
    
    dropdown.innerHTML = '';
    
    if (filteredMeals.length === 0) {
        dropdown.innerHTML = '<div class="meal-option">No meals found</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    filteredMeals.forEach(meal => {
        const option = document.createElement('div');
        option.className = 'meal-option';
        option.dataset.mealId = meal.id;
        option.dataset.mealName = meal.name;
        
        const details = [];
        if (meal.nationality) details.push(meal.nationality);
        if (meal.main_component) details.push(meal.main_component);
        if (meal.secondary_component) details.push(meal.secondary_component);
        
        option.innerHTML = `
            <div class="meal-option-name">${escapeHtml(meal.name)}</div>
            ${details.length > 0 ? `<div class="meal-option-details">${escapeHtml(details.join(' • '))}</div>` : ''}
        `;
        
        option.addEventListener('click', () => {
            input.value = meal.name;
            input.dataset.mealId = meal.id;
            dropdown.classList.add('hidden');
        });
        
        dropdown.appendChild(option);
    });
    
    dropdown.classList.remove('hidden');
}

// Save meal plan
async function saveMealPlan() {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = 'Saving...';
    saveStatus.className = 'save-status';
    
    const inputs = document.querySelectorAll('.meal-search-input');
    const updates = [];
    
    for (const input of inputs) {
        const date = input.dataset.date;
        const mealId = input.dataset.mealId || null;
        
        updates.push(
            fetch(`${API_BASE}/meal-plan/${date}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ meal_id: mealId })
            })
        );
    }
    
    try {
        await Promise.all(updates);
        saveStatus.textContent = 'Saved successfully!';
        saveStatus.className = 'save-status success';
        
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error saving meal plan:', error);
        saveStatus.textContent = 'Error saving meal plan';
        saveStatus.className = 'save-status error';
    }
}

// Show meal form
function showMealForm(meal = null) {
    const formContainer = document.getElementById('mealFormContainer');
    const formTitle = document.getElementById('formTitle');
    const mealForm = document.getElementById('mealForm');
    
    if (meal) {
        // Edit mode
        formTitle.textContent = 'Edit Meal';
        document.getElementById('mealId').value = meal.id;
        document.getElementById('mealName').value = meal.name || '';
        document.getElementById('nationality').value = meal.nationality || '';
        document.getElementById('mainComponent').value = meal.main_component || '';
        document.getElementById('secondaryComponent').value = meal.secondary_component || '';
        document.getElementById('recipeLocation').value = meal.recipe_location || '';
        currentEditingMealId = meal.id;
    } else {
        // Add mode
        formTitle.textContent = 'Add New Meal';
        mealForm.reset();
        document.getElementById('mealId').value = '';
        currentEditingMealId = null;
    }
    
    formContainer.classList.remove('hidden');
    document.getElementById('mealName').focus();
}

// Hide meal form
function hideMealForm() {
    document.getElementById('mealFormContainer').classList.add('hidden');
    document.getElementById('mealForm').reset();
    document.getElementById('formStatus').textContent = '';
    currentEditingMealId = null;
}

// Handle meal form submission
async function handleMealSubmit(e) {
    e.preventDefault();
    
    const formStatus = document.getElementById('formStatus');
    formStatus.textContent = 'Saving...';
    formStatus.className = 'form-status';
    
    const mealData = {
        name: document.getElementById('mealName').value,
        nationality: document.getElementById('nationality').value,
        main_component: document.getElementById('mainComponent').value,
        secondary_component: document.getElementById('secondaryComponent').value,
        recipe_location: document.getElementById('recipeLocation').value
    };
    
    try {
        const url = currentEditingMealId 
            ? `${API_BASE}/meals/${currentEditingMealId}`
            : `${API_BASE}/meals`;
        
        const method = currentEditingMealId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(mealData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save meal');
        }
        
        formStatus.textContent = 'Meal saved successfully!';
        formStatus.className = 'form-status success';
        
        // Reload meals and hide form
        await loadMeals();
        displayMealsList();
        
        setTimeout(() => {
            hideMealForm();
        }, 1500);
    } catch (error) {
        console.error('Error saving meal:', error);
        formStatus.textContent = error.message;
        formStatus.className = 'form-status error';
    }
}

// Display meals list
function displayMealsList() {
    const mealsList = document.getElementById('mealsList');
    mealsList.innerHTML = '';
    
    if (allMeals.length === 0) {
        mealsList.innerHTML = '<p>No meals found. Add your first meal!</p>';
        return;
    }
    
    allMeals.forEach(meal => {
        const mealItem = document.createElement('div');
        mealItem.className = 'meal-item';
        
        const details = [];
        if (meal.nationality) details.push(`<span class="meal-detail-item"><strong>Nationality:</strong> ${escapeHtml(meal.nationality)}</span>`);
        if (meal.main_component) details.push(`<span class="meal-detail-item"><strong>Main:</strong> ${escapeHtml(meal.main_component)}</span>`);
        if (meal.secondary_component) details.push(`<span class="meal-detail-item"><strong>Base:</strong> ${escapeHtml(meal.secondary_component)}</span>`);
        
        mealItem.innerHTML = `
            <div class="meal-info">
                <h3>${escapeHtml(meal.name)}</h3>
                <div class="meal-details">
                    ${details.join('')}
                </div>
                ${meal.recipe_location ? `<div class="meal-details" style="margin-top: 8px;">
                    <span class="meal-detail-item"><strong>Recipe:</strong> ${isValidUrl(meal.recipe_location) ? 
                        `<a href="${escapeHtml(meal.recipe_location)}" target="_blank" rel="noopener noreferrer">Link</a>` : 
                        escapeHtml(meal.recipe_location)}
                    </span>
                </div>` : ''}
            </div>
            <div class="meal-actions">
                <button class="btn btn-primary btn-small" onclick="editMeal(${meal.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteMeal(${meal.id}, '${escapeHtml(meal.name).replace(/'/g, "\\'")}')">Delete</button>
            </div>
        `;
        
        mealsList.appendChild(mealItem);
    });
}

// Edit meal
function editMeal(mealId) {
    const meal = allMeals.find(m => m.id === mealId);
    if (meal) {
        showMealForm(meal);
        // Scroll to form
        document.getElementById('mealFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete meal
async function deleteMeal(mealId, mealName) {
    if (!confirm(`Are you sure you want to delete "${mealName}"? This will also remove it from any planned dates.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/meals/${mealId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete meal');
        
        await loadMeals();
        displayMealsList();
    } catch (error) {
        console.error('Error deleting meal:', error);
        alert('Failed to delete meal');
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch history');
        
        const history = await response.json();
        displayHistory(history);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Display history
function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<p>No history available yet.</p>';
        return;
    }
    
    history.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const details = [];
        if (entry.nationality) details.push(entry.nationality);
        if (entry.main_component) details.push(entry.main_component);
        if (entry.secondary_component) details.push(entry.secondary_component);
        
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-meal-name">${escapeHtml(entry.meal_name)}</span>
                <span class="history-date">${formatDate(entry.date)}</span>
            </div>
            ${details.length > 0 ? `<div class="history-details">${escapeHtml(details.join(' • '))}</div>` : ''}
            <div class="history-comment">
                ${entry.comment ? `
                    <div class="comment-text">${escapeHtml(entry.comment)}</div>
                    <button class="btn btn-small btn-secondary" onclick="editComment(${entry.id}, '${escapeHtml(entry.comment).replace(/'/g, "\\'")}')">Edit Comment</button>
                ` : `
                    <button class="btn btn-small btn-primary" onclick="addComment(${entry.id})">Add Comment</button>
                `}
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// Add comment
function addComment(historyId) {
    const comment = prompt('Enter your comment:');
    if (comment !== null && comment.trim() !== '') {
        saveComment(historyId, comment);
    }
}

// Edit comment
function editComment(historyId, currentComment) {
    const comment = prompt('Edit comment:', currentComment);
    if (comment !== null && comment.trim() !== '') {
        saveComment(historyId, comment);
    }
}

// Save comment
async function saveComment(historyId, comment) {
    try {
        const response = await fetch(`${API_BASE}/history/${historyId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ comment })
        });
        
        if (!response.ok) throw new Error('Failed to save comment');
        
        loadHistory();
    } catch (error) {
        console.error('Error saving comment:', error);
        alert('Failed to save comment');
    }
}

// Archive past meals
async function archivePastMeals() {
    if (!confirm('This will archive all past meal plans to history. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/history/archive`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to archive meals');
        
        const result = await response.json();
        alert(`Archived ${result.archived} meal(s) to history`);
        loadHistory();
    } catch (error) {
        console.error('Error archiving meals:', error);
        alert('Failed to archive meals');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
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

// Check if string is a valid URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
