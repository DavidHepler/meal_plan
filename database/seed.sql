-- Sample meal data

INSERT INTO meals (name, nationality, main_component, secondary_component, recipe_location) VALUES
('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', ''),
-- ('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', ''),
('Taco Soup', 'Tex-Mex', 'Ground Beef', 'Beans', ''),
('Fish Tacos', 'Mexican', 'Fish', 'Tortillas', ''),
('Airfryer Fajitas', 'Tex-Mex', 'Pork', 'Tortillas', ''),
('Thai Fried Rice', 'Thai', 'Chicken', 'Rice', 'Davids Recipe Notbook'),
('Paprika Haenschen', '', 'Polenta', 'Rice', ''),
('Hamberger Helper', 'American', 'Ground Beef', 'Pasta', ''),
('Schinkennudeln', 'German', 'Ham', 'Pasta', ''),
('Käsespätzle', 'German', 'Cheese', 'Pasta', ''),
('BBQ Flammkuchen', 'French-American Fusion', 'Ground Beef', '', '');


-- Sample meal plan for the current week (starting from next Monday)
-- This will be populated with some initial data
-- INSERT INTO meal_plan (date, meal_id) VALUES
-- (date('now', 'weekday 1'), 1),  -- Monday
-- (date('now', 'weekday 1', '+1 day'), 5),  -- Tuesday
-- (date('now', 'weekday 1', '+2 days'), 3),  -- Wednesday
-- (date('now', 'weekday 1', '+3 days'), 8),  -- Thursday
-- (date('now', 'weekday 1', '+4 days'), 9),  -- Friday
-- (date('now', 'weekday 1', '+5 days'), 6),  -- Saturday
-- (date('now', 'weekday 1', '+6 days'), 4);  -- Sunday


