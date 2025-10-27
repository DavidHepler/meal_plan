const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = path.join(__dirname, 'database', 'meals.db');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads (for future use)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'meal-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const seedPath = path.join(__dirname, 'database', 'seed.sql');

    // Check if database is already initialized
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='meals'", (err, row) => {
        if (err) {
            console.error('Error checking database:', err);
            return;
        }

        if (!row) {
            // Database not initialized, run schema and seed
            console.log('Initializing database...');
            
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Error executing schema:', err);
                    return;
                }
                console.log('Schema created successfully');

                const seed = fs.readFileSync(seedPath, 'utf8');
                db.exec(seed, (err) => {
                    if (err) {
                        console.error('Error executing seed:', err);
                        return;
                    }
                    console.log('Database seeded successfully');
                });
            });
        } else {
            console.log('Database already initialized');
        }
    });
}

// Authentication middleware
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Authentication endpoint
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get meal plan for a date range (default: current week Monday-Sunday)
app.get('/api/meal-plan', (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query;
    let params;
    
    if (startDate && endDate) {
        query = `
            SELECT mp.id, mp.date, mp.meal_id, m.name, m.nationality, 
                   m.main_component, m.secondary_component, m.recipe_location
            FROM meal_plan mp
            LEFT JOIN meals m ON mp.meal_id = m.id
            WHERE mp.date BETWEEN ? AND ?
            ORDER BY mp.date
        `;
        params = [startDate, endDate];
    } else {
        // Get current week (Monday to Sunday)
        query = `
            SELECT mp.id, mp.date, mp.meal_id, m.name, m.nationality, 
                   m.main_component, m.secondary_component, m.recipe_location
            FROM meal_plan mp
            LEFT JOIN meals m ON mp.meal_id = m.id
            WHERE mp.date >= date('now', 'weekday 1', '-7 days')
              AND mp.date <= date('now', 'weekday 1', '-1 day')
            ORDER BY mp.date
        `;
        params = [];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get today's meal
app.get('/api/meal-plan/today', (req, res) => {
    const query = `
        SELECT mp.id, mp.date, mp.meal_id, m.name, m.nationality, 
               m.main_component, m.secondary_component, m.recipe_location
        FROM meal_plan mp
        LEFT JOIN meals m ON mp.meal_id = m.id
        WHERE mp.date = date('now')
    `;
    
    db.get(query, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || {});
    });
});

// Get 2-week meal plan for admin editing
app.get('/api/meal-plan/admin', authenticate, (req, res) => {
    // Get today and next 13 days (2 weeks)
    const query = `
        WITH RECURSIVE dates(date) AS (
            SELECT date('now', 'weekday 1')
            UNION ALL
            SELECT date(date, '+1 day')
            FROM dates
            WHERE date < date('now', 'weekday 1', '+13 days')
        )
        SELECT d.date, mp.id as plan_id, mp.meal_id, m.name, m.nationality,
               m.main_component, m.secondary_component, m.recipe_location
        FROM dates d
        LEFT JOIN meal_plan mp ON d.date = mp.date
        LEFT JOIN meals m ON mp.meal_id = m.id
        ORDER BY d.date
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Update meal plan for a specific date
app.put('/api/meal-plan/:date', authenticate, (req, res) => {
    const { date } = req.params;
    const { meal_id } = req.body;
    
    // First check if entry exists
    db.get('SELECT id FROM meal_plan WHERE date = ?', [date], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row) {
            // Update existing entry
            db.run(
                'UPDATE meal_plan SET meal_id = ? WHERE date = ?',
                [meal_id, date],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ success: true, changes: this.changes });
                }
            );
        } else {
            // Insert new entry
            db.run(
                'INSERT INTO meal_plan (date, meal_id) VALUES (?, ?)',
                [date, meal_id],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    });
});

// Get all meals
app.get('/api/meals', (req, res) => {
    const query = 'SELECT * FROM meals ORDER BY name';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get a single meal by ID
app.get('/api/meals/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM meals WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Meal not found' });
            return;
        }
        res.json(row);
    });
});

// Create a new meal
app.post('/api/meals', authenticate, (req, res) => {
    const { name, nationality, main_component, secondary_component, recipe_location } = req.body;
    
    const query = `
        INSERT INTO meals (name, nationality, main_component, secondary_component, recipe_location)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(
        query,
        [name, nationality, main_component, secondary_component, recipe_location],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'A meal with this name already exists' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update a meal
app.put('/api/meals/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { name, nationality, main_component, secondary_component, recipe_location } = req.body;
    
    const query = `
        UPDATE meals 
        SET name = ?, nationality = ?, main_component = ?, 
            secondary_component = ?, recipe_location = ?
        WHERE id = ?
    `;
    
    db.run(
        query,
        [name, nationality, main_component, secondary_component, recipe_location, id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'A meal with this name already exists' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Meal not found' });
                return;
            }
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Delete a meal
app.delete('/api/meals/:id', authenticate, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM meals WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Meal not found' });
            return;
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Get meal history (last year)
app.get('/api/history', authenticate, (req, res) => {
    const query = `
        SELECT h.id, h.date, h.meal_id, h.meal_name, h.comment, h.created_at,
               m.nationality, m.main_component, m.secondary_component
        FROM meal_history h
        LEFT JOIN meals m ON h.meal_id = m.id
        WHERE h.date >= date('now', '-1 year')
        ORDER BY h.date DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add or update comment for a history entry
app.post('/api/history/:id/comment', authenticate, (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    
    db.run(
        'UPDATE meal_history SET comment = ? WHERE id = ?',
        [comment, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'History entry not found' });
                return;
            }
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Archive past meal plans to history (cleanup job)
app.post('/api/history/archive', authenticate, (req, res) => {
    const query = `
        INSERT INTO meal_history (date, meal_id, meal_name)
        SELECT mp.date, m.id, m.name
        FROM meal_plan mp
        JOIN meals m ON mp.meal_id = m.id
        WHERE mp.date < date('now')
          AND NOT EXISTS (
              SELECT 1 FROM meal_history h 
              WHERE h.date = mp.date AND h.meal_id = mp.meal_id
          )
    `;
    
    db.run(query, [], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, archived: this.changes });
    });
});

// Cleanup old history (older than 1 year)
app.post('/api/history/cleanup', authenticate, (req, res) => {
    db.run(
        "DELETE FROM meal_history WHERE date < date('now', '-1 year')",
        [],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Upload meal image (for future use)
app.post('/api/meals/:id/image', authenticate, upload.single('image'), (req, res) => {
    const { id } = req.params;
    
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    
    const imagePath = `/uploads/${req.file.filename}`;
    
    db.run(
        'UPDATE meals SET image_path = ? WHERE id = ?',
        [imagePath, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                // Delete uploaded file if meal not found
                fs.unlinkSync(req.file.path);
                res.status(404).json({ error: 'Meal not found' });
                return;
            }
            res.json({ success: true, image_path: imagePath });
        }
    );
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing database...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
