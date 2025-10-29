// Admin Panel JavaScript
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5050/api' : '/api';
let authToken = localStorage.getItem('authToken');
let allMainDishes = [];
let allSideDishes = [];
let mealPlanData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (authToken) showAdminDashboard();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!e.target.id) switchSection(e.target.dataset.section);
        });
    });
    document.getElementById('savePlanBtn').addEventListener('click', saveMealPlan);
    document.getElementById('addMainDishBtn').addEventListener('click', () => showMainDishForm());
    document.getElementById('cancelMainDishBtn').addEventListener('click', hideMainDishForm);
    document.getElementById('mainDishForm').addEventListener('submit', handleMainDishSubmit);
    document.getElementById('addSideDishBtn').addEventListener('click', () => showSideDishForm());
    document.getElementById('cancelSideDishBtn').addEventListener('click', hideSideDishForm);
    document.getElementById('sideDishForm').addEventListener('submit', handleSideDishSubmit);
}

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
        if (!response.ok) throw new Error('Invalid password');
        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        loginError.classList.add('hidden');
        showAdminDashboard();
    } catch (error) {
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('password').value = '';
}

function showAdminDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadMainDishes();
    loadSideDishes();
    loadMealPlan();
}

function switchSection(sectionName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) btn.classList.add('active');
    });
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');
    if (sectionName === 'meal-plan') loadMealPlan();
    else if (sectionName === 'main-dishes') { loadMainDishes(); displayMainDishesList(); }
    else if (sectionName === 'side-dishes') { loadSideDishes(); displaySideDishesList(); }
    else if (sectionName === 'history') loadHistory();
}

async function loadMainDishes() {
    try {
        const response = await fetch(`${API_BASE}/main-dishes`);
        if (!response.ok) throw new Error('Failed to fetch main dishes');
        allMainDishes = await response.json();
        allMainDishes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error loading main dishes:', error);
    }
}

async function loadSideDishes() {
    try {
        const response = await fetch(`${API_BASE}/side-dishes`);
        if (!response.ok) throw new Error('Failed to fetch side dishes');
        allSideDishes = await response.json();
        allSideDishes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error loading side dishes:', error);
    }
}

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
        if (error.message.includes('401')) handleLogout();
    }
}

function displayMealPlan() {
    const mealPlanGrid = document.getElementById('mealPlanGrid');
    mealPlanGrid.innerHTML = '';
    const today = getTodayDateString();
    mealPlanData.forEach(day => {
        const isToday = day.date === today;
        const dayCard = document.createElement('div');
        dayCard.className = `plan-day-card ${isToday ? 'today' : ''}`;
        dayCard.dataset.date = day.date;
        const mainDishName = day.main_dish ? day.main_dish.name : '';
        const eatingOut = day.eating_out ? true : false;
        const eatingOutLocation = day.eating_out_location || '';
        dayCard.innerHTML = `
            <div class="plan-day-header">
                <span class="plan-day-name">${formatDateWithDay(day.date)}</span>
            </div>
            <div class="eating-out-section">
                <label class="eating-out-label">
                    <input type="checkbox" class="eating-out-checkbox" data-date="${day.date}" ${eatingOut ? 'checked' : ''}>
                    <span>Eating Out / Other</span>
                </label>
                <input type="text" class="eating-out-location" data-date="${day.date}" placeholder="Restaurant or location..." value="${escapeHtml(eatingOutLocation)}" ${!eatingOut ? 'disabled' : ''}>
            </div>
            <div class="meal-selector">
                <label>Main Dish:</label>
                <input type="text" class="main-dish-search-input" placeholder="Search or select main dish..." data-date="${day.date}" data-main-dish-id="${day.main_dish_id || ''}" value="${mainDishName}" autocomplete="off">
                <div class="main-dish-dropdown hidden"></div>
            </div>
            <div class="meal-selector">
                <label>Side Dishes:</label>
                <div class="side-dishes-container" data-date="${day.date}">
                    ${displaySideDishesForPlan(day.side_dishes)}
                </div>
                <button class="btn btn-small btn-secondary add-side-dish-btn" data-date="${day.date}">+ Add Side</button>
            </div>
        `;
        mealPlanGrid.appendChild(dayCard);
        const mainInput = dayCard.querySelector('.main-dish-search-input');
        const mainDropdown = dayCard.querySelector('.main-dish-dropdown');
        mainInput.addEventListener('focus', () => showMainDishDropdown(mainInput, mainDropdown));
        mainInput.addEventListener('input', () => showMainDishDropdown(mainInput, mainDropdown));
        mainInput.addEventListener('blur', () => setTimeout(() => mainDropdown.classList.add('hidden'), 200));
        dayCard.querySelector('.add-side-dish-btn').addEventListener('click', () => addSideDishSelector(day.date));
        
        // Add event listener for eating out checkbox
        const eatingOutCheckbox = dayCard.querySelector('.eating-out-checkbox');
        const eatingOutLocationInput = dayCard.querySelector('.eating-out-location');
        eatingOutCheckbox.addEventListener('change', () => {
            eatingOutLocationInput.disabled = !eatingOutCheckbox.checked;
            if (!eatingOutCheckbox.checked) {
                eatingOutLocationInput.value = '';
            }
        });
    });
}

function displaySideDishesForPlan(sideDishes) {
    if (!sideDishes || sideDishes.length === 0) return '<p class="no-sides">No side dishes selected</p>';
    return sideDishes.map(side => `<div class="side-dish-tag" data-side-id="${side.id}">${escapeHtml(side.name)}<button class="remove-side-btn" data-side-id="${side.id}">&times;</button></div>`).join('');
}

function addSideDishSelector(date) {
    const container = document.querySelector(`.side-dishes-container[data-date="${date}"]`);
    const noSides = container.querySelector('.no-sides');
    if (noSides) noSides.remove();
    const selector = document.createElement('div');
    selector.className = 'side-dish-selector';
    selector.innerHTML = `<select class="side-dish-select"><option value="">Select side dish...</option>${allSideDishes.map(side => `<option value="${side.id}">${escapeHtml(side.name)}</option>`).join('')}</select><button class="btn btn-small btn-secondary cancel-side-btn">Cancel</button>`;
    container.appendChild(selector);
    const select = selector.querySelector('.side-dish-select');
    select.addEventListener('change', (e) => {
        if (e.target.value) {
            const sideId = e.target.value;
            const sideName = allSideDishes.find(s => s.id == sideId)?.name || '';
            const tag = document.createElement('div');
            tag.className = 'side-dish-tag';
            tag.dataset.sideId = sideId;
            tag.innerHTML = `${escapeHtml(sideName)} <button class="remove-side-btn" data-side-id="${sideId}">&times;</button>`;
            container.insertBefore(tag, selector);
            selector.remove();
            tag.querySelector('.remove-side-btn').addEventListener('click', (e) => { e.target.closest('.side-dish-tag').remove(); checkIfNoSides(container); });
        }
    });
    selector.querySelector('.cancel-side-btn').addEventListener('click', () => selector.remove());
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-side-btn')) {
            e.target.closest('.side-dish-tag').remove();
            checkIfNoSides(container);
        }
    });
}

function checkIfNoSides(container) {
    const tags = container.querySelectorAll('.side-dish-tag');
    if (tags.length === 0) container.innerHTML = '<p class="no-sides">No side dishes selected</p>';
}

function showMainDishDropdown(input, dropdown) {
    const searchTerm = input.value.toLowerCase();
    const filteredDishes = allMainDishes.filter(dish => dish.name.toLowerCase().includes(searchTerm) || (dish.nationality && dish.nationality.toLowerCase().includes(searchTerm)) || (dish.main_component && dish.main_component.toLowerCase().includes(searchTerm)));
    dropdown.innerHTML = '';
    if (filteredDishes.length === 0) {
        dropdown.innerHTML = '<div class="meal-option">No main dishes found</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    filteredDishes.forEach(dish => {
        const option = document.createElement('div');
        option.className = 'meal-option';
        const details = [];
        if (dish.nationality) details.push(dish.nationality);
        if (dish.main_component) details.push(dish.main_component);
        if (dish.base_component) details.push(dish.base_component);
        option.innerHTML = `<div class="meal-option-name">${escapeHtml(dish.name)}</div>${details.length > 0 ? `<div class="meal-option-details">${escapeHtml(details.join(' • '))}</div>` : ''}`;
        option.addEventListener('click', () => { input.value = dish.name; input.dataset.mainDishId = dish.id; dropdown.classList.add('hidden'); });
        dropdown.appendChild(option);
    });
    dropdown.classList.remove('hidden');
}

async function saveMealPlan() {
    const saveStatus = document.getElementById('saveStatus');
    const savePlanBtn = document.getElementById('savePlanBtn');
    savePlanBtn.disabled = true;
    saveStatus.textContent = 'Saving changes...';
    saveStatus.className = 'save-status';
    const dayCards = document.querySelectorAll('.plan-day-card');
    const updates = [];
    for (const card of dayCards) {
        const date = card.dataset.date;
        const mainInput = card.querySelector('.main-dish-search-input');
        const mainDishId = mainInput.dataset.mainDishId || null;
        const sideTags = card.querySelectorAll('.side-dish-tag');
        const sideIds = Array.from(sideTags).map(tag => tag.dataset.sideId).filter(Boolean);
        const sideIdsString = sideIds.length > 0 ? sideIds.join(',') : '';
        
        // Get eating out fields
        const eatingOutCheckbox = card.querySelector('.eating-out-checkbox');
        const eatingOutLocationInput = card.querySelector('.eating-out-location');
        const eatingOut = eatingOutCheckbox.checked;
        const eatingOutLocation = eatingOut ? eatingOutLocationInput.value.trim() : '';
        
        updates.push(fetch(`${API_BASE}/meal-plan/${date}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ 
                main_dish_id: mainDishId, 
                side_dish_ids: sideIdsString,
                eating_out: eatingOut,
                eating_out_location: eatingOutLocation
            })
        }));
    }
    try {
        await Promise.all(updates);
        saveStatus.textContent = 'Meal plan saved successfully!';
        saveStatus.className = 'save-status success';
        savePlanBtn.disabled = false;
        setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 5000);
    } catch (error) {
        console.error('Error saving meal plan:', error);
        saveStatus.textContent = 'Error saving meal plan';
        saveStatus.className = 'save-status error';
        savePlanBtn.disabled = false;
    }
}

function showMainDishForm(dish = null) {
    const formContainer = document.getElementById('mainDishFormContainer');
    const formTitle = document.getElementById('mainDishFormTitle');
    const form = document.getElementById('mainDishForm');
    if (dish) {
        formTitle.textContent = 'Edit Main Dish';
        document.getElementById('mainDishId').value = dish.id;
        document.getElementById('mainDishName').value = dish.name || '';
        document.getElementById('mainDishNationality').value = dish.nationality || '';
        document.getElementById('mainDishMainComponent').value = dish.main_component || '';
        document.getElementById('mainDishBaseComponent').value = dish.base_component || '';
        document.getElementById('mainDishRecipeLocation').value = dish.recipe_location || '';
    } else {
        formTitle.textContent = 'Add New Main Dish';
        form.reset();
        document.getElementById('mainDishId').value = '';
    }
    formContainer.classList.remove('hidden');
    document.getElementById('mainDishName').focus();
}

function hideMainDishForm() {
    document.getElementById('mainDishFormContainer').classList.add('hidden');
    document.getElementById('mainDishForm').reset();
    document.getElementById('mainDishFormStatus').textContent = '';
}

async function handleMainDishSubmit(e) {
    e.preventDefault();
    const formStatus = document.getElementById('mainDishFormStatus');
    formStatus.textContent = 'Saving...';
    formStatus.className = 'form-status';
    const dishData = {
        name: document.getElementById('mainDishName').value,
        nationality: document.getElementById('mainDishNationality').value,
        main_component: document.getElementById('mainDishMainComponent').value,
        base_component: document.getElementById('mainDishBaseComponent').value,
        recipe_location: document.getElementById('mainDishRecipeLocation').value
    };
    try {
        const id = document.getElementById('mainDishId').value;
        const url = id ? `${API_BASE}/main-dishes/${id}` : `${API_BASE}/main-dishes`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(dishData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save main dish');
        }
        formStatus.textContent = 'Main dish saved successfully!';
        formStatus.className = 'form-status success';
        await loadMainDishes();
        displayMainDishesList();
        setTimeout(() => hideMainDishForm(), 1500);
    } catch (error) {
        console.error('Error saving main dish:', error);
        formStatus.textContent = error.message;
        formStatus.className = 'form-status error';
    }
}

function displayMainDishesList() {
    const list = document.getElementById('mainDishesList');
    list.innerHTML = '';
    if (allMainDishes.length === 0) {
        list.innerHTML = '<p>No main dishes found. Add your first main dish!</p>';
        return;
    }
    allMainDishes.forEach(dish => {
        const item = document.createElement('div');
        item.className = 'meal-item';
        const details = [];
        if (dish.nationality) details.push(`<span class="meal-detail-item"><strong>Nationality:</strong> ${escapeHtml(dish.nationality)}</span>`);
        if (dish.main_component) details.push(`<span class="meal-detail-item"><strong>Main:</strong> ${escapeHtml(dish.main_component)}</span>`);
        if (dish.base_component) details.push(`<span class="meal-detail-item"><strong>Base:</strong> ${escapeHtml(dish.base_component)}</span>`);
        item.innerHTML = `
            <div class="meal-info">
                <h3>${escapeHtml(dish.name)}</h3>
                <div class="meal-details">${details.join('')}</div>
                ${dish.recipe_location ? `<div class="meal-details" style="margin-top: 8px;"><span class="meal-detail-item"><strong>Recipe:</strong> ${isValidUrl(dish.recipe_location) ? `<a href="${escapeHtml(dish.recipe_location)}" target="_blank" rel="noopener noreferrer">Link</a>` : escapeHtml(dish.recipe_location)}</span></div>` : ''}
            </div>
            <div class="meal-actions">
                <button class="btn btn-primary btn-small" onclick="editMainDish(${dish.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteMainDish(${dish.id}, '${escapeHtml(dish.name).replace(/'/g, "\'")}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function editMainDish(dishId) {
    const dish = allMainDishes.find(d => d.id === dishId);
    if (dish) {
        showMainDishForm(dish);
        document.getElementById('mainDishFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteMainDish(dishId, dishName) {
    if (!confirm(`Are you sure you want to delete "${dishName}"?`)) return;
    try {
        const response = await fetch(`${API_BASE}/main-dishes/${dishId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('Failed to delete main dish');
        await loadMainDishes();
        displayMainDishesList();
    } catch (error) {
        console.error('Error deleting main dish:', error);
        alert('Failed to delete main dish');
    }
}

function showSideDishForm(dish = null) {
    const formContainer = document.getElementById('sideDishFormContainer');
    const formTitle = document.getElementById('sideDishFormTitle');
    const form = document.getElementById('sideDishForm');
    if (dish) {
        formTitle.textContent = 'Edit Side Dish';
        document.getElementById('sideDishId').value = dish.id;
        document.getElementById('sideDishName').value = dish.name || '';
        document.getElementById('sideDishType').value = dish.type || '';
        document.getElementById('sideDishNotes').value = dish.notes || '';
    } else {
        formTitle.textContent = 'Add New Side Dish';
        form.reset();
        document.getElementById('sideDishId').value = '';
    }
    formContainer.classList.remove('hidden');
    document.getElementById('sideDishName').focus();
}

function hideSideDishForm() {
    document.getElementById('sideDishFormContainer').classList.add('hidden');
    document.getElementById('sideDishForm').reset();
    document.getElementById('sideDishFormStatus').textContent = '';
}

async function handleSideDishSubmit(e) {
    e.preventDefault();
    const formStatus = document.getElementById('sideDishFormStatus');
    formStatus.textContent = 'Saving...';
    formStatus.className = 'form-status';
    const dishData = {
        name: document.getElementById('sideDishName').value,
        type: document.getElementById('sideDishType').value,
        notes: document.getElementById('sideDishNotes').value
    };
    try {
        const id = document.getElementById('sideDishId').value;
        const url = id ? `${API_BASE}/side-dishes/${id}` : `${API_BASE}/side-dishes`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(dishData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save side dish');
        }
        formStatus.textContent = 'Side dish saved successfully!';
        formStatus.className = 'form-status success';
        await loadSideDishes();
        displaySideDishesList();
        setTimeout(() => hideSideDishForm(), 1500);
    } catch (error) {
        console.error('Error saving side dish:', error);
        formStatus.textContent = error.message;
        formStatus.className = 'form-status error';
    }
}

function displaySideDishesList() {
    const list = document.getElementById('sideDishesList');
    list.innerHTML = '';
    if (allSideDishes.length === 0) {
        list.innerHTML = '<p>No side dishes found. Add your first side dish!</p>';
        return;
    }
    allSideDishes.forEach(dish => {
        const item = document.createElement('div');
        item.className = 'meal-item';
        item.innerHTML = `
            <div class="meal-info">
                <h3>${escapeHtml(dish.name)}</h3>
                <div class="meal-details">
                    ${dish.type ? `<span class="meal-detail-item"><strong>Type:</strong> ${escapeHtml(dish.type)}</span>` : ''}
                    ${dish.notes ? `<span class="meal-detail-item"><strong>Notes:</strong> ${escapeHtml(dish.notes)}</span>` : ''}
                </div>
            </div>
            <div class="meal-actions">
                <button class="btn btn-primary btn-small" onclick="editSideDish(${dish.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteSideDish(${dish.id}, '${escapeHtml(dish.name).replace(/'/g, "\'")}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function editSideDish(dishId) {
    const dish = allSideDishes.find(d => d.id === dishId);
    if (dish) {
        showSideDishForm(dish);
        document.getElementById('sideDishFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteSideDish(dishId, dishName) {
    if (!confirm(`Are you sure you want to delete "${dishName}"?`)) return;
    try {
        const response = await fetch(`${API_BASE}/side-dishes/${dishId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('Failed to delete side dish');
        await loadSideDishes();
        displaySideDishesList();
    } catch (error) {
        console.error('Error deleting side dish:', error);
        alert('Failed to delete side dish');
    }
}

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
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-meal-name">${escapeHtml(entry.main_dish_name || 'Unknown')}</span>
                <span class="history-date">${formatDate(entry.date)}</span>
            </div>
            ${entry.side_dish_names ? `<div class="history-details">Sides: ${escapeHtml(entry.side_dish_names)}</div>` : ''}
            <div class="history-comment">
                ${entry.comment ? `<div class="comment-text">${escapeHtml(entry.comment)}</div><button class="btn btn-small btn-secondary" onclick="editComment(${entry.id}, '${escapeHtml(entry.comment).replace(/'/g, "\'")}')">Edit Comment</button>` : `<button class="btn btn-small btn-primary" onclick="addComment(${entry.id})">Add Comment</button>`}
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

function addComment(historyId) {
    const comment = prompt('Enter your comment:');
    if (comment !== null && comment.trim() !== '') saveComment(historyId, comment);
}

function editComment(historyId, currentComment) {
    const comment = prompt('Edit comment:', currentComment);
    if (comment !== null && comment.trim() !== '') saveComment(historyId, comment);
}

async function saveComment(historyId, comment) {
    try {
        const response = await fetch(`${API_BASE}/history/${historyId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ comment })
        });
        if (!response.ok) throw new Error('Failed to save comment');
        loadHistory();
    } catch (error) {
        console.error('Error saving comment:', error);
        alert('Failed to save comment');
    }
}

function formatDateWithDay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[date.getDay()];
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = date.toLocaleDateString('en-US', options);
    return `${dayName}, ${dateFormatted}`;
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
