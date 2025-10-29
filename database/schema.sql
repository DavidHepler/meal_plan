
-- Table for storing main dishes
CREATE TABLE IF NOT EXISTS main_dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    nationality TEXT,
    main_component TEXT,
    base_component TEXT,
    recipe_location TEXT,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing side dishes
CREATE TABLE IF NOT EXISTS side_dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing the meal plan (main and sides for each date)
CREATE TABLE IF NOT EXISTS meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    main_dish_id INTEGER,
    side_dish_ids TEXT, -- Comma-separated list of side dish IDs
    eating_out BOOLEAN DEFAULT 0, -- 1 if eating out/away, 0 otherwise
    eating_out_location TEXT, -- Restaurant name or "Friend's house", etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (main_dish_id) REFERENCES main_dishes(id) ON DELETE SET NULL
);

-- Table for storing meal history with comments
CREATE TABLE IF NOT EXISTS meal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    main_dish_id INTEGER,
    main_dish_name TEXT,
    side_dish_ids TEXT,
    side_dish_names TEXT,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (main_dish_id) REFERENCES main_dishes(id) ON DELETE SET NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);
CREATE INDEX IF NOT EXISTS idx_meal_history_date ON meal_history(date);
CREATE INDEX IF NOT EXISTS idx_meal_history_main_dish_id ON meal_history(main_dish_id);

-- Trigger to update updated_at timestamp on main_dishes table
CREATE TRIGGER IF NOT EXISTS update_main_dishes_timestamp 
AFTER UPDATE ON main_dishes
BEGIN
    UPDATE main_dishes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on side_dishes table
CREATE TRIGGER IF NOT EXISTS update_side_dishes_timestamp 
AFTER UPDATE ON side_dishes
BEGIN
    UPDATE side_dishes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on meal_plan table
CREATE TRIGGER IF NOT EXISTS update_meal_plan_timestamp 
AFTER UPDATE ON meal_plan
BEGIN
    UPDATE meal_plan SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to archive meal plan to history when updated or before deletion
CREATE TRIGGER IF NOT EXISTS archive_to_history_on_update
AFTER UPDATE OF main_dish_id ON meal_plan
WHEN OLD.main_dish_id IS NOT NULL AND OLD.date < date('now')
BEGIN
    INSERT INTO meal_history (date, main_dish_id, main_dish_name, side_dish_ids, side_dish_names)
    SELECT OLD.date, m.id, m.name, OLD.side_dish_ids, ''
    FROM main_dishes m
    WHERE m.id = OLD.main_dish_id;
END;
