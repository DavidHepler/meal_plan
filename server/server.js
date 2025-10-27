
// server.js for new meal plan structure (main_dishes, side_dishes, meal_plan)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5050;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = path.join(__dirname, '../database/meals.db');

app.use(cors());
app.use(express.json());

// Utility: get YYYY-MM-DD string
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize DB
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema and seed data
function initializeDatabase() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const seedPath = path.join(__dirname, '../database/seed.sql');
    
    // Check if tables exist
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='main_dishes'", (err, row) => {
        if (err) {
            console.error('Error checking database:', err);
            return;
        }
        
        if (!row) {
            console.log('Initializing database schema...');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating schema:', err);
                } else {
                    console.log('Database schema created successfully');
                    // Load seed data
                    const seed = fs.readFileSync(seedPath, 'utf8');
                    db.exec(seed, (err) => {
                        if (err) {
                            console.error('Error loading seed data:', err);
                        } else {
                            console.log('Seed data loaded successfully');
                        }
                    });
                }
            });
        } else {
            console.log('Database already initialized');
        }
    });
}

// Auth middleware
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Auth endpoint
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// MAIN DISHES CRUD
app.get('/api/main-dishes', (req, res) => {
    db.all('SELECT * FROM main_dishes ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/main-dishes/:id', (req, res) => {
    db.get('SELECT * FROM main_dishes WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Main dish not found' });
        res.json(row);
    });
});

app.post('/api/main-dishes', authenticate, (req, res) => {
    const { name, nationality, main_component, base_component, recipe_location } = req.body;
    db.run(
        'INSERT INTO main_dishes (name, nationality, main_component, base_component, recipe_location) VALUES (?, ?, ?, ?, ?)',
        [name, nationality, main_component, base_component, recipe_location],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A main dish with this name already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/main-dishes/:id', authenticate, (req, res) => {
    const { name, nationality, main_component, base_component, recipe_location } = req.body;
    db.run(
        'UPDATE main_dishes SET name=?, nationality=?, main_component=?, base_component=?, recipe_location=? WHERE id=?',
        [name, nationality, main_component, base_component, recipe_location, req.params.id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A main dish with this name already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Main dish not found' });
            res.json({ success: true, changes: this.changes });
        }
    );
});

app.delete('/api/main-dishes/:id', authenticate, (req, res) => {
    db.run('DELETE FROM main_dishes WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Main dish not found' });
        res.json({ success: true, changes: this.changes });
    });
});

// SIDE DISHES CRUD
app.get('/api/side-dishes', (req, res) => {
    db.all('SELECT * FROM side_dishes ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/side-dishes/:id', (req, res) => {
    db.get('SELECT * FROM side_dishes WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Side dish not found' });
        res.json(row);
    });
});

app.post('/api/side-dishes', authenticate, (req, res) => {
    const { name, type, notes } = req.body;
    db.run(
        'INSERT INTO side_dishes (name, type, notes) VALUES (?, ?, ?)',
        [name, type, notes],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A side dish with this name already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/side-dishes/:id', authenticate, (req, res) => {
    const { name, type, notes } = req.body;
    db.run(
        'UPDATE side_dishes SET name=?, type=?, notes=? WHERE id=?',
        [name, type, notes, req.params.id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A side dish with this name already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Side dish not found' });
            res.json({ success: true, changes: this.changes });
        }
    );
});

app.delete('/api/side-dishes/:id', authenticate, (req, res) => {
    db.run('DELETE FROM side_dishes WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Side dish not found' });
        res.json({ success: true, changes: this.changes });
    });
});

// MEAL PLAN
// Get meal plan for a date range (default: 8 days from today)
app.get('/api/meal-plan', (req, res) => {
    const { startDate, endDate } = req.query;
    let query, params;
    if (startDate && endDate) {
        query = `SELECT * FROM meal_plan WHERE date BETWEEN ? AND ? ORDER BY date`;
        params = [startDate, endDate];
    } else {
        const today = new Date();
        const endDay = new Date(today);
        endDay.setDate(today.getDate() + 7);
        query = `SELECT * FROM meal_plan WHERE date BETWEEN ? AND ? ORDER BY date`;
        params = [getDateString(today), getDateString(endDay)];
    }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Attach main/side dish details
        const promises = rows.map(row => enrichMealPlanRow(row));
        Promise.all(promises).then(fullRows => res.json(fullRows));
    });
});

// Get meal plan for a specific date
app.get('/api/meal-plan/date/:date', (req, res) => {
    const { date } = req.params;
    db.get('SELECT * FROM meal_plan WHERE date = ?', [date], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ date });
        const fullRow = await enrichMealPlanRow(row);
        res.json(fullRow);
    });
});

// Get 2-week meal plan for admin
app.get('/api/meal-plan/admin', authenticate, (req, res) => {
    // Get Monday of current week and next 13 days
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    const mondayStr = getDateString(monday);
    const query = `
        WITH RECURSIVE dates(date) AS (
            SELECT ?
            UNION ALL
            SELECT date(date, '+1 day')
            FROM dates
            WHERE date < date(?, '+13 days')
        )
        SELECT d.date, mp.id as plan_id, mp.main_dish_id, mp.side_dish_ids
        FROM dates d
        LEFT JOIN meal_plan mp ON d.date = mp.date
        ORDER BY d.date
    `;
    db.all(query, [mondayStr, mondayStr], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Attach main/side dish details
        const promises = rows.map(row => enrichMealPlanRow(row));
        const fullRows = await Promise.all(promises);
        res.json(fullRows);
    });
});

// Update meal plan for a specific date
app.put('/api/meal-plan/:date', authenticate, (req, res) => {
    const { date } = req.params;
    const { main_dish_id, side_dish_ids } = req.body;
    db.get('SELECT id FROM meal_plan WHERE date = ?', [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            db.run('UPDATE meal_plan SET main_dish_id=?, side_dish_ids=? WHERE date=?',
                [main_dish_id, side_dish_ids, date],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, changes: this.changes });
                }
            );
        } else {
            db.run('INSERT INTO meal_plan (date, main_dish_id, side_dish_ids) VALUES (?, ?, ?)',
                [date, main_dish_id, side_dish_ids],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    });
});

// Helper: enrich meal plan row with main/side dish details
function enrichMealPlanRow(row) {
    return new Promise((resolve) => {
        if (!row) return resolve(row);
        db.get('SELECT * FROM main_dishes WHERE id = ?', [row.main_dish_id], (err, mainDish) => {
            if (err) return resolve(row);
            let sideDishIds = [];
            if (row.side_dish_ids) {
                sideDishIds = row.side_dish_ids.split(',').map(id => parseInt(id.trim())).filter(Boolean);
            }
            if (sideDishIds.length === 0) {
                resolve({ ...row, main_dish: mainDish, side_dishes: [] });
            } else {
                db.all(`SELECT * FROM side_dishes WHERE id IN (${sideDishIds.map(() => '?').join(',')})`, sideDishIds, (err, sideDishes) => {
                    resolve({ ...row, main_dish: mainDish, side_dishes: sideDishes || [] });
                });
            }
        });
    });
}

// MEAL HISTORY (last year)
app.get('/api/history', authenticate, (req, res) => {
    const query = `SELECT * FROM meal_history WHERE date >= date('now', '-1 year') ORDER BY date DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add or update comment for a history entry
app.post('/api/history/:id/comment', authenticate, (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    db.run('UPDATE meal_history SET comment = ? WHERE id = ?', [comment, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'History entry not found' });
        res.json({ success: true, changes: this.changes });
    });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
