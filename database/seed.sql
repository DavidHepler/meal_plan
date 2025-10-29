
-- Sample main dishes
-- Note: Commented entries below are from previous version (had typos)
-- ('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', ''),  -- duplicate removed
-- ('Hamberger Helper', 'American', 'Beef', 'Pasta', ''),  -- typo: was "Hamberger"
-- ('Paprika Haenschen', '', 'Polenta', 'Rice', ''),  -- incorrect: main was "Polenta" 

INSERT INTO main_dishes (name, nationality, main_component, base_component, recipe_location) VALUES
('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', ''),
('Taco Soup', 'Tex-Mex', 'Beef', 'Beans', ''),
('Fish Tacos', 'Mexican', 'Fish', 'Tortillas', ''),
('Airfryer Fajitas', 'Tex-Mex', 'Pork', 'Tortillas', ''),
('Thai Fried Rice', 'Thai', 'Chicken', 'Rice', 'Davids Recipe Notebook'),
('Paprika Haenschen', '', 'Chicken', 'Rice', ''),
('Hamburger Helper', 'American', 'Beef', 'Pasta', ''),
('Schinkennudeln', 'German', 'Ham', 'Pasta', ''),
('Käsespätzle', 'German', 'Cheese', 'Pasta', ''),
('BBQ Flammkuchen', 'French-American Fusion', 'Beef', '', ''),
('Creamy Garlic Parmesan Chicken', 'Italian-American', 'Chicken', 'None', ''),
('Fischfilet À la Bordelaise', 'French', 'Fish', 'None', ''),
('Fleischpflanzerl', 'German', 'Beef', 'None', ''),
('Gefüllte Paprika', 'German', 'Beef', 'None', ''),
('Broccoli-Cheese-Soup', 'American', 'Vegetarian', 'None', 'Paprika');

-- Sample side dishes
INSERT INTO side_dishes (name, type, notes) VALUES
('Green Salad', 'Salad', ''),
('Garlic Bread', 'Bread', ''),
('Roasted Vegetables', 'Vegetable', ''),
('Coleslaw', 'Salad', ''),
('Rice Pilaf', 'Grain', ''),
('Mashed Potatoes', 'Potato', ''),
('Fruit Salad', 'Fruit', ''),
('Corn on the Cob', 'Vegetable', ''),
('Steamed Broccoli', 'Vegetable', ''),
('Beans', 'Legume', ''),
('Baguette', 'Bread', ''),
('Grillbrot', 'Bread', ''),
('Focaccia', 'Bread', ''),
('Ciabatta', 'Bread', '');

-- Sample meal plan for the current week (starting from next Monday)
-- Example: main_dish_id = 1, side_dish_ids = '1,2' (comma-separated)
-- INSERT INTO meal_plan (date, main_dish_id, side_dish_ids) VALUES
-- 	(date('now', 'weekday 1'), 1, '1,2'),  -- Monday
-- 	(date('now', 'weekday 1', '+1 day'), 5, '3,4'),  -- Tuesday
-- 	(date('now', 'weekday 1', '+2 days'), 3, '5'),  -- Wednesday
-- 	(date('now', 'weekday 1', '+3 days'), 8, '6,7'),  -- Thursday
-- 	(date('now', 'weekday 1', '+4 days'), 9, '8'),  -- Friday
-- 	(date('now', 'weekday 1', '+5 days'), 6, '9,10'),  -- Saturday
-- 	(date('now', 'weekday 1', '+6 days'), 4, '1,3');  -- Sunday


