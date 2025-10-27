-- Sample meal data

INSERT INTO meals (name, nationality, main_component, secondary_component, recipe_location) VALUES
('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', ''),
('Flammkuchen', 'French', 'Beef', '', '');

-- Sample meal plan for the current week (starting from next Monday)
-- This will be populated with some initial data
INSERT INTO meal_plan (date, meal_id) VALUES
(date('now', 'weekday 1'), 1),  -- Monday
(date('now', 'weekday 1', '+1 day'), 5),  -- Tuesday
(date('now', 'weekday 1', '+2 days'), 3),  -- Wednesday
(date('now', 'weekday 1', '+3 days'), 8),  -- Thursday
(date('now', 'weekday 1', '+4 days'), 9),  -- Friday
(date('now', 'weekday 1', '+5 days'), 6),  -- Saturday
(date('now', 'weekday 1', '+6 days'), 4);  -- Sunday

-- Sample meal plan for next week
INSERT INTO meal_plan (date, meal_id) VALUES
(date('now', 'weekday 1', '+7 days'), 10),
(date('now', 'weekday 1', '+8 days'), 12),
(date('now', 'weekday 1', '+9 days'), 15),
(date('now', 'weekday 1', '+10 days'), 18),
(date('now', 'weekday 1', '+11 days'), 14),
(date('now', 'weekday 1', '+12 days'), 19),
(date('now', 'weekday 1', '+13 days'), 7);

-- Sample history entries (past meals with comments)
INSERT INTO meal_history (date, meal_id, meal_name, comment) VALUES
(date('now', '-7 days'), 1, 'Spaghetti Carbonara', 'Kids loved it!'),
(date('now', '-14 days'), 5, 'Grilled Salmon with Rice', 'Great warm weather dish'),
(date('now', '-21 days'), 3, 'Beef Tacos', 'Took 30 minutes longer than recipe said'),
(date('now', '-28 days'), 4, 'Schnitzel with Spätzle', 'Everyone asked for seconds'),
(date('now', '-35 days'), 9, 'Fish and Chips', 'Kids didn''t like it much this time');
