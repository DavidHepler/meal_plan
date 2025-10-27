-- Meal Planning Database Schema

-- Table for storing meal definitions
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    nationality TEXT,
    main_component TEXT,
    secondary_component TEXT,
    recipe_location TEXT,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing the meal plan (which meal on which date)
CREATE TABLE IF NOT EXISTS meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    meal_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL
);

-- Table for storing meal history with comments
CREATE TABLE IF NOT EXISTS meal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    meal_id INTEGER NOT NULL,
    meal_name TEXT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- Index for faster date queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);
CREATE INDEX IF NOT EXISTS idx_meal_history_date ON meal_history(date);
CREATE INDEX IF NOT EXISTS idx_meal_history_meal_id ON meal_history(meal_id);

-- Trigger to update updated_at timestamp on meals table
CREATE TRIGGER IF NOT EXISTS update_meals_timestamp 
AFTER UPDATE ON meals
BEGIN
    UPDATE meals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on meal_plan table
CREATE TRIGGER IF NOT EXISTS update_meal_plan_timestamp 
AFTER UPDATE ON meal_plan
BEGIN
    UPDATE meal_plan SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to archive meal plan to history when updated or before deletion
CREATE TRIGGER IF NOT EXISTS archive_to_history_on_update
AFTER UPDATE OF meal_id ON meal_plan
WHEN OLD.meal_id IS NOT NULL AND OLD.date < date('now')
BEGIN
    INSERT INTO meal_history (date, meal_id, meal_name)
    SELECT OLD.date, m.id, m.name
    FROM meals m
    WHERE m.id = OLD.meal_id;
END;
