
// server.js for new meal plan structure (main_dishes, side_dishes, meal_plan)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
const INITIAL_USER_PASSWORD = process.env.INITIAL_USER_PASSWORD || 'changeMe123!';
const DB_PATH = path.join(__dirname, 'database/meals.db');

// Trust proxy - needed when behind nginx/reverse proxy
app.set('trust proxy', 1);

// Warn if using default JWT secret in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using randomly generated JWT_SECRET. Set JWT_SECRET environment variable in production!');
}

app.use(cors());
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
    // Content Security Policy - prevents XSS attacks
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
    
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Force HTTPS in production (HSTS)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
});

// X-Frame-Options only for admin routes to prevent clickjacking on admin panel
app.use('/api/auth', (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

app.use('/api/main-dishes', (req, res, next) => {
    if (req.method !== 'GET') {
        res.setHeader('X-Frame-Options', 'DENY');
    }
    next();
});

app.use('/api/side-dishes', (req, res, next) => {
    if (req.method !== 'GET') {
        res.setHeader('X-Frame-Options', 'DENY');
    }
    next();
});

app.use('/api/meal-plan', (req, res, next) => {
    if (req.method !== 'GET' || req.path.includes('/admin')) {
        res.setHeader('X-Frame-Options', 'DENY');
    }
    next();
});

app.use('/api/history', (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Rate limiter for login attempts (5 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful logins from counting
    skipSuccessfulRequests: true
});

// General API rate limiter (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);

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
    const schemaPath = path.join(__dirname, 'database/schema.sql');
    const seedPath = path.join(__dirname, 'database/seed.sql');
    const userMigrationPath = path.join(__dirname, 'database/migrate_add_users.sql');
    
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
                            runUserMigration();
                        }
                    });
                }
            });
        } else {
            console.log('Database already initialized');
            runUserMigration();
        }
    });
    
    function runUserMigration() {
        // Check if users table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
            if (err) {
                console.error('Error checking users table:', err);
                return;
            }
            
            if (!row && fs.existsSync(userMigrationPath)) {
                console.log('Running user authentication migration...');
                const migration = fs.readFileSync(userMigrationPath, 'utf8');
                db.exec(migration, (err) => {
                    if (err) {
                        console.error('Error running user migration:', err);
                    } else {
                        console.log('User authentication tables created successfully');
                        createInitialUser();
                    }
                });
            } else if (row) {
                console.log('User authentication already configured');
                // Check if initial user exists
                db.get("SELECT id FROM users WHERE username = 'kat'", (err, user) => {
                    if (!err && !user) {
                        createInitialUser();
                    }
                });
            }
        });
    }
    
    function createInitialUser() {
        console.log('Creating initial user "kat"...');
        const passwordHash = bcrypt.hashSync(INITIAL_USER_PASSWORD, 10);
        db.run(
            'INSERT INTO users (username, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)',
            ['kat', passwordHash, 'Kat'],
            function(err) {
                if (err) {
                    console.error('Error creating initial user:', err);
                } else {
                    console.log(`✅ Initial user "kat" created successfully`);
                    console.log(`⚠️  Default password: ${INITIAL_USER_PASSWORD}`);
                    console.log('🔒 Please change this password immediately!');
                }
            }
        );
    }
}

// Helper: Get client IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
}

// Helper: Hash token for session storage
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: Log login attempt
function logLoginAttempt(username, ip, success) {
    db.run(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
        [username, ip, success ? 1 : 0],
        (err) => {
            if (err) console.error('Error logging login attempt:', err);
        }
    );
}

// Helper: Check recent failed login attempts
function checkLoginAttempts(username, ip, callback) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // Check both username and IP-based attempts
    db.all(
        `SELECT COUNT(*) as count FROM login_attempts 
         WHERE (username = ? OR ip_address = ?) 
         AND success = 0 
         AND attempted_at > ?
         GROUP BY CASE WHEN username = ? THEN 'user' ELSE 'ip' END`,
        [username, ip, fifteenMinutesAgo, username],
        (err, rows) => {
            if (err) return callback(err);
            
            // If more than 5 failed attempts from this username or IP
            const maxAttempts = rows && rows.length > 0 ? Math.max(...rows.map(r => r.count)) : 0;
            callback(null, maxAttempts >= 5);
        }
    );
}

// Helper: Audit log
function auditLog(userId, action, resource, resourceId, details, ip) {
    db.run(
        'INSERT INTO audit_log (user_id, action, resource, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, action, resource, resourceId, details, ip],
        (err) => {
            if (err) console.error('Error writing audit log:', err);
        }
    );
}

// Auth middleware with JWT validation
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);
    
    // Verify JWT token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }
        
        // Check if session exists and is not revoked
        db.get(
            'SELECT s.*, u.username, u.is_active FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.revoked = 0 AND s.expires_at > datetime("now")',
            [tokenHash],
            (err, session) => {
                if (err || !session || !session.is_active) {
                    return res.status(401).json({ error: 'Unauthorized - Session invalid' });
                }
                
                // Attach user info to request
                req.user = {
                    id: decoded.userId,
                    username: session.username
                };
                next();
            }
        );
    });
}

// Auth endpoint - Login with username and password
app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const clientIp = getClientIp(req);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Check if too many failed attempts
    checkLoginAttempts(username, clientIp, (err, locked) => {
        if (err) {
            console.error('Error checking login attempts:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (locked) {
            logLoginAttempt(username, clientIp, false);
            return res.status(429).json({ 
                error: 'Too many failed login attempts. Account locked for 15 minutes.' 
            });
        }
        
        // Find user
        db.get(
            'SELECT id, username, password_hash, display_name, is_active FROM users WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    console.error('Database error during login:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                // Check if user exists and is active
                if (!user || !user.is_active) {
                    logLoginAttempt(username, clientIp, false);
                    return res.status(401).json({ error: 'Invalid username or password' });
                }
                
                // Verify password
                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                
                if (!passwordMatch) {
                    logLoginAttempt(username, clientIp, false);
                    return res.status(401).json({ error: 'Invalid username or password' });
                }
                
                // Generate JWT token
                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRATION }
                );
                
                const tokenHash = hashToken(token);
                const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
                
                // Store session
                db.run(
                    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
                    [user.id, tokenHash, expiresAt],
                    function(err) {
                        if (err) {
                            console.error('Error creating session:', err);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        
                        // Update last login
                        db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
                        
                        // Log successful attempt
                        logLoginAttempt(username, clientIp, true);
                        auditLog(user.id, 'LOGIN', 'auth', null, 'Successful login', clientIp);
                        
                        // Clean up old expired sessions
                        db.run('DELETE FROM sessions WHERE expires_at < datetime("now") OR revoked = 1');
                        
                        res.json({
                            success: true,
                            token: token,
                            user: {
                                username: user.username,
                                displayName: user.display_name
                            },
                            expiresIn: JWT_EXPIRATION
                        });
                    }
                );
            }
        );
    });
});

// Logout endpoint - Revoke session
app.post('/api/auth/logout', authenticate, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);
    const clientIp = getClientIp(req);
    
    db.run(
        'UPDATE sessions SET revoked = 1 WHERE token_hash = ?',
        [tokenHash],
        function(err) {
            if (err) {
                console.error('Error revoking session:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            auditLog(req.user.id, 'LOGOUT', 'auth', null, 'User logged out', clientIp);
            res.json({ success: true, message: 'Logged out successfully' });
        }
    );
});

// Change password endpoint
app.post('/api/auth/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const clientIp = getClientIp(req);
    
    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Get user's current password hash
    db.get(
        'SELECT id, username, password_hash FROM users WHERE id = ?',
        [req.user.id],
        async (err, user) => {
            if (err) {
                console.error('Database error during password change:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Verify current password
            const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            
            if (!passwordMatch) {
                auditLog(req.user.id, 'PASSWORD_CHANGE_FAILED', 'auth', null, 'Incorrect current password', clientIp);
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            
            // Update password
            db.run(
                'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
                [newPasswordHash, req.user.id],
                function(err) {
                    if (err) {
                        console.error('Error updating password:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    
                    // Log success
                    auditLog(req.user.id, 'PASSWORD_CHANGED', 'auth', null, 'Password changed successfully', clientIp);
                    
                    // Optionally revoke all other sessions (force re-login everywhere)
                    // For now, we'll keep other sessions active
                    
                    res.json({ 
                        success: true, 
                        message: 'Password changed successfully' 
                    });
                }
            );
        }
    );
});

// Legacy endpoint for backwards compatibility (will be removed)
app.post('/api/auth', (req, res) => {
    res.status(410).json({ 
        error: 'This endpoint is deprecated. Please use /api/auth/login with username and password.' 
    });
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
        SELECT d.date, mp.id as plan_id, mp.main_dish_id, mp.side_dish_ids, mp.eating_out, mp.eating_out_location
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
    const { main_dish_id, side_dish_ids, eating_out, eating_out_location } = req.body;
    db.get('SELECT id FROM meal_plan WHERE date = ?', [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            db.run('UPDATE meal_plan SET main_dish_id=?, side_dish_ids=?, eating_out=?, eating_out_location=? WHERE date=?',
                [main_dish_id, side_dish_ids, eating_out ? 1 : 0, eating_out_location || null, date],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, changes: this.changes });
                }
            );
        } else {
            db.run('INSERT INTO meal_plan (date, main_dish_id, side_dish_ids, eating_out, eating_out_location) VALUES (?, ?, ?, ?, ?)',
                [date, main_dish_id, side_dish_ids, eating_out ? 1 : 0, eating_out_location || null],
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

// ---- MEAL HISTORY ARCHIVING ----

// Archive past meal plan entries to history (one entry per date, no duplicates)
function archivePastMeals() {
    const today = getDateString(new Date());
    console.log(`[Archive] Running meal archival for dates before ${today}...`);

    // Find meal_plan rows for past dates that have a main_dish and are NOT yet in history
    const query = `
        SELECT mp.date, mp.main_dish_id, mp.side_dish_ids, mp.eating_out, mp.eating_out_location
        FROM meal_plan mp
        WHERE mp.date < ?
          AND (mp.main_dish_id IS NOT NULL OR mp.eating_out = 1)
          AND mp.date NOT IN (SELECT date FROM meal_history)
        ORDER BY mp.date
    `;
    db.all(query, [today], (err, rows) => {
        if (err) {
            console.error('[Archive] Error querying meal_plan:', err);
            return;
        }
        if (!rows || rows.length === 0) {
            console.log('[Archive] No new meals to archive.');
            return;
        }
        console.log(`[Archive] Found ${rows.length} meal(s) to archive.`);
        rows.forEach(row => archiveSingleMeal(row));
    });
}

// Archive a single meal plan row to history
function archiveSingleMeal(row) {
    // Handle eating out entries
    if (row.eating_out && !row.main_dish_id) {
        const mainDishName = row.eating_out_location
            ? `Eating Out - ${row.eating_out_location}`
            : 'Eating Out';
        db.run(
            `INSERT INTO meal_history (date, main_dish_id, main_dish_name, side_dish_ids, side_dish_names)
             VALUES (?, NULL, ?, NULL, NULL)`,
            [row.date, mainDishName],
            (err) => {
                if (err) console.error(`[Archive] Error archiving eating-out ${row.date}:`, err);
                else console.log(`[Archive] Archived eating-out for ${row.date}`);
            }
        );
        return;
    }

    // Look up main dish name
    db.get('SELECT name FROM main_dishes WHERE id = ?', [row.main_dish_id], (err, mainDish) => {
        if (err) {
            console.error(`[Archive] Error looking up main dish for ${row.date}:`, err);
            return;
        }
        const mainDishName = mainDish ? mainDish.name : 'Unknown';

        // Resolve side dish names
        const sideIds = row.side_dish_ids
            ? row.side_dish_ids.split(',').map(id => parseInt(id.trim())).filter(Boolean)
            : [];

        if (sideIds.length === 0) {
            insertHistory(row.date, row.main_dish_id, mainDishName, row.side_dish_ids, '');
        } else {
            const placeholders = sideIds.map(() => '?').join(',');
            db.all(`SELECT name FROM side_dishes WHERE id IN (${placeholders})`, sideIds, (err, sides) => {
                const sideNames = (!err && sides) ? sides.map(s => s.name).join(', ') : '';
                insertHistory(row.date, row.main_dish_id, mainDishName, row.side_dish_ids, sideNames);
            });
        }
    });
}

function insertHistory(date, mainDishId, mainDishName, sideIds, sideNames) {
    db.run(
        `INSERT INTO meal_history (date, main_dish_id, main_dish_name, side_dish_ids, side_dish_names)
         VALUES (?, ?, ?, ?, ?)`,
        [date, mainDishId, mainDishName, sideIds, sideNames],
        (err) => {
            if (err) console.error(`[Archive] Error inserting history for ${date}:`, err);
            else console.log(`[Archive] Archived meal for ${date}: ${mainDishName}`);
        }
    );
}

// Remove duplicate history entries (keep only the latest per date) and drop old trigger
function cleanupHistoryDuplicates() {
    console.log('[Cleanup] Removing duplicate history entries...');
    db.run(
        `DELETE FROM meal_history
         WHERE id NOT IN (
             SELECT MAX(id) FROM meal_history GROUP BY date
         )`,
        function (err) {
            if (err) console.error('[Cleanup] Error removing duplicates:', err);
            else console.log(`[Cleanup] Removed ${this.changes} duplicate history row(s).`);
        }
    );

    // Drop the old trigger if it still exists
    db.run('DROP TRIGGER IF EXISTS archive_to_history_on_update', (err) => {
        if (err) console.error('[Cleanup] Error dropping old trigger:', err);
        else console.log('[Cleanup] Old archive trigger removed (if it existed).');
    });
}

// Schedule archival: run once at startup (after a short delay), then every 24 hours
function scheduleArchival() {
    // Wait 10 seconds after startup for DB to be ready, then run
    setTimeout(() => {
        cleanupHistoryDuplicates();
        // Small delay to let cleanup finish before archiving new entries
        setTimeout(() => archivePastMeals(), 3000);
    }, 10000);

    // Then run every 24 hours
    setInterval(() => {
        archivePastMeals();
    }, 24 * 60 * 60 * 1000);
}

// MEAL HISTORY API
app.get('/api/history', authenticate, (req, res) => {
    // Run archival on-demand when history is viewed, to catch any stragglers
    const today = getDateString(new Date());
    const archiveQuery = `
        SELECT mp.date, mp.main_dish_id, mp.side_dish_ids, mp.eating_out, mp.eating_out_location
        FROM meal_plan mp
        WHERE mp.date < ?
          AND (mp.main_dish_id IS NOT NULL OR mp.eating_out = 1)
          AND mp.date NOT IN (SELECT date FROM meal_history)
        ORDER BY mp.date
    `;
    db.all(archiveQuery, [today], (err, rows) => {
        if (!err && rows && rows.length > 0) {
            rows.forEach(row => archiveSingleMeal(row));
        }
        // Short delay to let any inserts finish, then return history
        setTimeout(() => {
            const query = `SELECT * FROM meal_history WHERE date >= date('now', '-1 year') ORDER BY date DESC`;
            db.all(query, [], (err, historyRows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(historyRows);
            });
        }, 500);
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

// Note: Static files are served by nginx container, not by this API server

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    scheduleArchival();
});
