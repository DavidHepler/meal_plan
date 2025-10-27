# Feature Update Summary

## Overview
This update adds support for:
1. **New main components**: Ground Beef, Ham, Bacon, Cheese, and Pork/Beef
2. **New base components**: Tortillas, Beans, Gnocchi, Blumenkohl, Buchweizen, Kritharaki, Potatoes, and None
3. **Custom component inputs**: Ability to add custom main and base components not in the predefined lists
4. **Suggested side field**: A new field that appears when base component is "None", allowing you to specify a suggested side dish

## Database Changes

### Schema Updates (`database/schema.sql`)
- Added `suggested_side` column to the `meals` table
- This field stores suggested side dishes when the base component is "None"

### Seed Data Updates (`database/seed.sql`)
- Updated INSERT statement to include the `suggested_side` column
- Added suggested sides for meals with base component "None":
  - Creamy Garlic Parmesan Chicken: "Rice or Pasta"
  - Fischfilet À la Bordelaise: "Potatoes"
  - Fleischpflanzerl: "Potatoes or Salad"
  - Gefüllte Paprika: "Rice"
- Fixed main component for "Paprika Haenschen" from "Polenta" to "Chicken"
- Fixed main component for "Gnocchi mit grünem Spargel" to "Vegetarian"

## Frontend Changes

### Admin Panel (`public/admin.html`)
Added to the meal form:
1. **Expanded Main Component dropdown** with options:
   - Fish, Chicken, Beef, Pork, Ground Beef, Ham, Bacon, Cheese, Pork/Beef, Vegetarian
   - Custom (enter below) option

2. **Custom Main Component input field**
   - Appears when "Custom" is selected in Main Component dropdown

3. **Expanded Base Component dropdown** with options:
   - Rice, Pasta, Potatoes, Tortillas, Beans, Gnocchi, Blumenkohl, Buchweizen, Kritharaki, None
   - Custom (enter below) option

4. **Custom Base Component input field**
   - Appears when "Custom" is selected in Base Component dropdown

5. **Suggested Side input field**
   - Appears when "None" is selected in Base Component dropdown
   - Includes helpful text: "Shown when base component is 'None'"

### Admin Panel JavaScript (`public/js/admin.js`)
Added functionality:
1. **handleMainComponentChange()**: Shows/hides custom main component input
2. **handleBaseComponentChange()**: Shows/hides custom base component input and suggested side field
3. **Updated showMealForm()**: 
   - Detects if a component is custom (not in predefined list) and sets dropdown to "Custom"
   - Populates custom input fields appropriately
   - Shows suggested side field when base is "None"
4. **Updated handleMealSubmit()**:
   - Uses custom component values when "Custom" is selected
   - Only includes suggested_side when base component is "None"
5. **Updated displayMealsList()**: Shows suggested side in meal details when available

### Kiosk Display (`public/index.html`)
Added:
- New modal row for "Suggested Side" (hidden by default)

### Kiosk JavaScript (`public/js/kiosk.js`)
Updated **showMealModal()**:
- Displays suggested side only when available
- Hides the row when suggested_side is null or empty

## Backend Changes

### Server API (`server/server.js`)
Updated all meal-related endpoints to include `suggested_side`:

1. **GET /api/meal-plan**: Returns suggested_side in meal data
2. **GET /api/meal-plan/today**: Returns suggested_side
3. **GET /api/meal-plan/date/:date**: Returns suggested_side for both planned and archived meals
4. **GET /api/meal-plan/admin**: Returns suggested_side for 2-week admin view
5. **POST /api/meals**: Accepts and stores suggested_side
6. **PUT /api/meals/:id**: Updates suggested_side

## Migration Instructions

To apply these changes to an existing database:

1. **Backup your current database** (meals.db)

2. **Add the new column** to existing database:
   ```sql
   ALTER TABLE meals ADD COLUMN suggested_side TEXT;
   ```

3. **Update existing meals** with suggested sides where appropriate:
   ```sql
   UPDATE meals SET suggested_side = 'Rice or Pasta' WHERE name = 'Creamy Garlic Parmesan Chicken';
   UPDATE meals SET suggested_side = 'Potatoes' WHERE name = 'Fischfilet À la Bordelaise';
   UPDATE meals SET suggested_side = 'Potatoes or Salad' WHERE name = 'Fleischpflanzerl';
   UPDATE meals SET suggested_side = 'Rice' WHERE name = 'Gefüllte Paprika';
   ```

4. **Restart the application** to load the updated code

## Usage Guide

### Adding a New Meal with Custom Components

1. Go to Admin Panel → Manage Meals → Add New Meal
2. For Main Component:
   - Select from dropdown if it's a standard option
   - Select "Custom" and enter a custom value in the text field
3. For Base Component:
   - Select from dropdown if it's a standard option
   - Select "Custom" and enter a custom value
   - If you select "None", a "Suggested Side" field will appear
4. Enter suggested side (optional) when base is "None"

### Viewing Suggested Sides

- In the kiosk view, click on any meal to see details
- If a meal has a suggested side, it will appear in the modal
- Suggested sides only appear when they are available (not shown for meals without them)

## Benefits

1. **Flexibility**: Can now add any type of main or base component without being limited to predefined options
2. **Better meal planning**: Suggested sides help when planning meals that don't have a traditional base
3. **Cleaner UI**: Suggested sides only appear when relevant
4. **Backward compatible**: Existing meals without suggested sides continue to work normally
