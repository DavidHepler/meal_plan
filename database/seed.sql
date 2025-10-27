-- Sample meal data

INSERT INTO meals (name, nationality, main_component, secondary_component, recipe_location) VALUES
('Spaghetti Carbonara', 'Italian', 'Pork', 'Pasta', 'https://www.allrecipes.com/recipe/11973/spaghetti-carbonara-ii/'),
('Chicken Tikka Masala', 'Indian', 'Chicken', 'Rice', 'https://www.bbcgoodfood.com/recipes/chicken-tikka-masala'),
('Beef Tacos', 'Tex-Mex', 'Beef', 'Other', 'https://www.simplyrecipes.com/recipes/beef_tacos/'),
('Schnitzel with Spätzle', 'German', 'Pork', 'Other Grain', 'https://www.thespruceeats.com/wiener-schnitzel-recipe-1447089'),
('Grilled Salmon with Rice', 'Japanese', 'Fish', 'Rice', 'https://www.justonecookbook.com/grilled-fish/'),
('Margherita Pizza', 'Italian', 'Vegetarian', 'Other', 'https://www.bbcgoodfood.com/recipes/margherita-pizza'),
('Sauerbraten', 'German', 'Beef', 'Potato', 'https://www.thespruceeats.com/sauerbraten-recipe-1447283'),
('Thai Green Curry', 'Thai', 'Chicken', 'Rice', 'https://www.bbcgoodfood.com/recipes/thai-green-curry'),
('Fish and Chips', 'British', 'Fish', 'Potato', 'https://www.bbcgoodfood.com/recipes/classic-fish-chips'),
('Vegetable Stir Fry', 'Chinese', 'Vegetarian', 'Rice', 'https://www.simplyrecipes.com/recipes/vegetable_stir_fry/'),
('Bratwurst with Sauerkraut', 'German', 'Pork', 'Potato', 'https://www.thespruceeats.com/bratwurst-with-sauerkraut-1447074'),
('Chicken Fajitas', 'Tex-Mex', 'Chicken', 'Other', 'https://www.allrecipes.com/recipe/76496/chicken-fajitas/'),
('Pasta Primavera', 'Italian', 'Vegetarian', 'Pasta', 'https://www.allrecipes.com/recipe/223042/pasta-primavera/'),
('Baked Cod with Potatoes', 'Scandinavian', 'Fish', 'Potato', 'https://www.bbcgoodfood.com/recipes/baked-cod-tomatoes'),
('Beef Stroganoff', 'Russian', 'Beef', 'Pasta', 'https://www.allrecipes.com/recipe/16311/beef-stroganoff-iii/'),
('Vegetarian Chili', 'Tex-Mex', 'Vegetarian', 'Rice', 'https://cookieandkate.com/vegetarian-chili-recipe/'),
('Pork Schnitzel', 'German', 'Pork', 'Potato', 'https://www.thespruceeats.com/pork-schnitzel-recipe-1447256'),
('Teriyaki Chicken', 'Japanese', 'Chicken', 'Rice', 'https://www.allrecipes.com/recipe/128532/teriyaki-chicken/'),
('Lasagna', 'Italian', 'Beef', 'Pasta', 'https://www.allrecipes.com/recipe/23600/worlds-best-lasagna/'),
('Grilled Trout', 'German', 'Fish', 'Potato', 'https://www.thespruceeats.com/grilled-trout-recipe-1447251');

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
