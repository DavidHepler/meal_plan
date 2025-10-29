# Eating Out / Away Feature

## Overview
This feature allows you to indicate when you're eating out at a restaurant or at a friend's house instead of cooking at home. This helps you maintain a complete meal calendar even when you're not cooking.

## How It Works

### Admin Panel
When planning meals in the admin panel, each day now includes:
- **Eating Out / Away checkbox**: Check this box when you won't be cooking at home
- **Location text field**: Enter where you'll be eating (restaurant name, "Friend's house", etc.)
  - This field is disabled unless the checkbox is checked
  - The location is optional but recommended for better tracking

### Kiosk Display
When viewing your meal plan on the kiosk dashboard:
- Days marked as "Eating Out" show a special indicator: 🍽️ Eating Out
- If a location was entered, it displays below the indicator
- The eating out status is clearly visible in both week view and single-day view

## Database Changes
Two new columns added to the `meal_plan` table:
- `eating_out` (BOOLEAN, default 0): Indicates if eating out/away
- `eating_out_location` (TEXT, nullable): Optional location description

### Migration
If you have an existing database, run the migration script:
```bash
sqlite3 mealplan.db < database/migrate_add_eating_out.sql
```

Or if using Docker:
```bash
docker exec -i meal-plan-server sqlite3 /app/mealplan.db < database/migrate_add_eating_out.sql
```

## Use Cases
- **Restaurants**: Enter the restaurant name to remember where you ate
- **Friend's/Family's House**: Note whose house you're visiting
- **Events**: Track special occasions when you won't be cooking
- **Vacation**: Mark days when you're away from home

## Notes
- You can still add main dish and sides along with the "Eating Out" marker if you want to track what you ate
- The location field accepts any text, so you can be as specific or general as you'd like
- The eating out indicator is styled distinctly (orange color) to stand out in the calendar view
