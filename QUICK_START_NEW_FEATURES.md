# Quick Start Guide - New Features

## Adding Custom Main Components

When adding or editing a meal in the Admin Panel:

1. In the **Main Component** dropdown, you'll now see:
   - Fish
   - Chicken
   - Beef
   - Pork
   - Ground Beef ⭐ *NEW*
   - Ham ⭐ *NEW*
   - Bacon ⭐ *NEW*
   - Cheese ⭐ *NEW*
   - Pork/Beef ⭐ *NEW*
   - Vegetarian
   - Custom (enter below) ⭐ *NEW*

2. If you select **"Custom"**, a text field appears below where you can enter any main component (e.g., "Lamb", "Turkey", "Tofu", etc.)

## Adding Custom Base Components

In the **Base Component** dropdown, you'll now see:

- Rice
- Pasta
- Potatoes ⭐ *NEW*
- Tortillas ⭐ *NEW*
- Beans ⭐ *NEW*
- Gnocchi ⭐ *NEW*
- Blumenkohl ⭐ *NEW*
- Buchweizen ⭐ *NEW*
- Kritharaki ⭐ *NEW*
- None ⭐ *NEW*
- Custom (enter below) ⭐ *NEW*

### Using "None" for Base Component

When you select **"None"** as the base component, a new field appears:

**Suggested Side** - Enter a recommended side dish here (e.g., "Rice", "Potatoes", "Salad", "Rice or Pasta")

This is perfect for meals like:
- Grilled chicken with no traditional base
- Steak
- Fish fillets
- Stuffed vegetables

## Examples

### Example 1: Meal with No Base
- **Name**: Grilled Salmon
- **Main Component**: Fish
- **Base Component**: None
- **Suggested Side**: Steamed Vegetables or Rice ✨
- **Result**: When viewing this meal, users will see "Suggested Side: Steamed Vegetables or Rice"

### Example 2: Custom Main Component
- **Name**: Lamb Curry
- **Main Component**: Custom → enter "Lamb"
- **Base Component**: Rice
- **Suggested Side**: (not shown, since base is not "None")
- **Result**: Meal displays with "Lamb" as the main component

### Example 3: Custom Base Component
- **Name**: Chicken with Polenta
- **Main Component**: Chicken
- **Base Component**: Custom → enter "Polenta"
- **Result**: Meal displays with "Polenta" as the base component

## Viewing Meals

### Kiosk/Dashboard View
1. Click on any meal card to see full details
2. A modal will open showing:
   - Meal Name
   - Date
   - Nationality
   - Main Component
   - Base Component (Secondary Component)
   - **Suggested Side** (only if available) ⭐
   - Recipe Location (if available)

### Admin Panel - Meals List
The meals list now displays suggested sides in the meal details when available.

## Important Notes

- ✅ Suggested side **only appears** when Base Component is "None"
- ✅ Custom components are saved as the exact text you enter
- ✅ Existing meals without suggested sides continue to work normally
- ✅ You can edit any meal to add/change components or suggested sides
- ✅ In the dashboard, suggested sides only show when they exist (clean UI)

## Tips

1. **Be consistent** with custom component names (e.g., always use "Potatoes" not "Potato" and "potatoes")
2. **Use suggested sides** to help with meal planning when the meal doesn't have a traditional base
3. **Multiple suggestions** are okay (e.g., "Rice or Pasta" or "Potatoes, Salad, or Bread")
4. Leave suggested side **empty** if not needed

## Need Help?

If you accidentally select "Custom" but want to use a standard option:
1. Simply change the dropdown back to the desired standard option
2. The custom input field will disappear automatically
3. Any text in the custom field is ignored when a standard option is selected
