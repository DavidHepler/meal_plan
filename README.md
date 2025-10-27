# Meal Plan Application

A web application for managing and displaying weekly meal plans with an admin interface for meal management and planning.

## Features

### Main Kiosk View
- **7-Day View**: Display meals for the entire week (Monday - Sunday)
- **Single Day View**: Show only today's meal in a larger format
- **Dark/Light Mode**: Toggle between light and dark themes
- **Clickable Recipes**: Meal names link to recipes when available
- **Auto-refresh**: Page refreshes every 5 minutes to show latest data

### Admin Panel
- **Password Protected**: Simple authentication system
- **2-Week Meal Planning**: Plan meals for the next 14 days
- **Searchable Meal Selection**: Find meals quickly with autocomplete dropdown
- **Meal Management**: Add, edit, and delete meals from the database
- **Meal History**: View past meals (last 365 days) with comments
- **Meal Details**: Track nationality, main component, base component, and recipe location

### Meal Database
Each meal includes:
- Name (displayed in kiosk mode)
- Nationality (e.g., German, Tex-Mex, Italian)
- Main Component (Fish, Chicken, Beef, Pork, Vegetarian)
- Secondary/Base Component (Rice, Pasta, Potato, Other Grain)
- Recipe Location (URL or text description)
- Image support (filesystem storage, ready for future implementation)

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js with Express
- **Database**: SQLite3
- **Web Server**: Nginx
- **Container**: Docker & Docker Compose

## Installation

### Prerequisites
- Docker
- Docker Compose

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meal_plan
   ```

2. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env to change the admin password
   ```

3. **Build and start the application**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application**
   - **Main Kiosk View**: http://localhost:5040
   - **Admin Panel**: http://localhost:5040/admin.html
   - **Default Password**: `admin123` (change in `.env`)

## Usage

### Main Kiosk Page
- The page automatically displays the current week's meal plan
- Click "Today's Meal" to switch to single-day view
- Click "🌙 Dark Mode" to toggle dark theme
- Click on meal names (if they have recipe links) to view recipes

### Admin Panel

#### Login
- Navigate to http://localhost:5040/admin.html
- Enter the admin password (default: `admin123`)

#### Managing Meals
1. Click "Manage Meals" in the navigation
2. Click "Add New Meal" to create a new meal
3. Fill in the meal details and click "Save Meal"
4. Edit or delete existing meals using the buttons next to each meal

#### Planning Meals
1. Click "Meal Plan" in the navigation
2. Click in any day's meal field
3. Start typing to search for meals
4. Select a meal from the dropdown
5. Click "Save Changes" when done

#### Viewing History
1. Click "History" in the navigation
2. View past meals from the last 365 days
3. Add comments to meals (e.g., "Kids loved it!", "Took longer than expected")
4. Click "Archive Past Meals" to move old meal plans to history

## Docker Volumes

- **meal_uploads**: Stores uploaded meal images (for future image upload feature)
- **./database**: Stores the SQLite database file (persists across container restarts)

## Ports

- **5040**: Nginx web server (main application access)
- **5050**: Node.js API server (internal, proxied through Nginx)

## Database Schema

### Tables
- **meals**: Stores meal definitions
- **meal_plan**: Maps dates to meals
- **meal_history**: Archives past meals with optional comments

### Automatic Features
- Timestamps automatically updated on changes
- History can be archived automatically
- Old history (>1 year) can be cleaned up via admin panel

## Development

### Project Structure
```
meal_plan/
├── database/
│   ├── schema.sql      # Database schema
│   └── seed.sql        # Sample data
├── public/
│   ├── index.html      # Main kiosk page
│   ├── admin.html      # Admin panel
│   ├── css/
│   │   ├── kiosk.css   # Kiosk styles with dark/light themes
│   │   └── admin.css   # Admin panel styles
│   └── js/
│       ├── kiosk.js    # Kiosk functionality
│       └── admin.js    # Admin functionality
├── server/
│   ├── server.js       # Express API server
│   ├── package.json    # Node dependencies
│   └── Dockerfile      # Server container
├── docker-compose.yml  # Container orchestration
├── Dockerfile          # Nginx container
├── nginx.conf          # Nginx configuration
└── README.md
```

### Making Changes

1. **Update the code** in the appropriate files
2. **Rebuild containers**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f web
```

## Future Enhancements

### Planned Features
- **Image Upload**: Upload and display meal images
  - Images stored in filesystem via Docker volume
  - Upload endpoint already implemented in server
  - UI for image upload needs to be added
  
### Potential Improvements
- Multiple user accounts with different permissions
- Meal categories and filtering
- Recipe import from URLs
- Shopping list generation
- Meal rotation suggestions
- Mobile app version
- Print-friendly meal plans

## Troubleshooting

### Database not initializing
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d --build
```

### Permission issues
Ensure the database directory has proper permissions:
```bash
chmod -R 755 database/
```

### Cannot access application
- Ensure ports 5040 and 5050 are not in use
- Check Docker containers are running: `docker-compose ps`
- Check logs: `docker-compose logs`

## License

This project is provided as-is for personal use.

## Support

For issues or questions, please check the logs first:
```bash
docker-compose logs -f
```

Common issues:
- Database file permissions
- Port conflicts
- Docker network issues
