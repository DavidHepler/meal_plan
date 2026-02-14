# Security Setup Guide

This document describes the security enhancements implemented for the Meal Plan Admin panel and how to configure them.

## 🔒 Security Features Implemented

### 1. **User Authentication with Username/Password**
- Replaced simple password-only auth with proper username/password authentication
- User: `kat` (hardcoded for now)
- Passwords are hashed using bcrypt (10 rounds)

### 2. **JWT Token Authentication**
- Secure JWT tokens with expiration (default: 8 hours)
- Tokens are NOT the password itself
- Session management with server-side revocation support

### 3. **Rate Limiting**
- **Login attempts**: 5 failed attempts per IP address → 15-minute lockout
- **General API**: 100 requests per 15 minutes per IP
- Prevents brute force attacks

### 4. **Security Headers**
- **Content-Security-Policy (CSP)**: Prevents XSS attacks
- **X-Content-Type-Options**: Prevents MIME-sniffing attacks
- **X-XSS-Protection**: Legacy XSS filter for older browsers
- **Strict-Transport-Security (HSTS)**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking on admin routes only

### 5. **Session Management**
- Server-side session tracking in database
- Remote logout capability (revokes tokens)
- Automatic cleanup of expired sessions

### 6. **Audit Logging**
- All admin actions logged with user ID, action, resource, IP address
- Login attempts tracked for security monitoring

## 📋 Initial Setup

### Step 1: Set Environment Variables

Create a `.env` file in the project root (or set in docker-compose.yml):

```bash
# JWT Secret (REQUIRED in production - generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# JWT token expiration (optional, default: 8h)
JWT_EXPIRATION=8h

# Initial password for user 'kat' (optional, default: changeMe123!)
INITIAL_USER_PASSWORD=YourSecurePassword123!

# Node environment
NODE_ENV=production
```

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 2: Update docker-compose.yml

Add environment variables to the server service:

```yaml
server:
  build:
    context: .
    dockerfile: ./server/Dockerfile
  ports:
    - "5050:3000"
  environment:
    - NODE_ENV=production
    - JWT_SECRET=${JWT_SECRET}
    - JWT_EXPIRATION=${JWT_EXPIRATION:-8h}
    - INITIAL_USER_PASSWORD=${INITIAL_USER_PASSWORD:-changeMe123!}
    - TZ=America/Chicago
  volumes:
    - meal_data:/app/database
    - meal_uploads:/app/uploads
  restart: unless-stopped
```

### Step 3: Install Dependencies

```bash
cd server
npm install
```

This installs the new security packages:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `express-rate-limit` - Rate limiting middleware

### Step 4: Run Database Migration

The migration runs automatically on server startup. The server will:
1. Check if `users` table exists
2. If not, run the migration from `database/migrate_add_users.sql`
3. Create initial user `kat` with the password from `INITIAL_USER_PASSWORD`

**Watch the logs for:**
```
✅ Initial user "kat" created successfully
⚠️  Default password: changeMe123!
🔒 Please change this password immediately!
```

### Step 5: Start the Application

```bash
docker-compose up -d
```

Or for development:
```bash
cd server
node server.js
```

### Step 6: First Login

1. Navigate to `https://your-domain.com/admin.html`
2. Login with:
   - **Username**: `kat`
   - **Password**: The value of `INITIAL_USER_PASSWORD` (default: `changeMe123!`)

## 🔐 Security Best Practices

### Production Deployment

1. **ALWAYS set a custom JWT_SECRET** - Never use the default random generation in production
2. **Use strong initial password** - Set `INITIAL_USER_PASSWORD` to a strong, unique password
3. **Enable HTTPS** - Ensure all traffic uses HTTPS (handled by nginx in your docker setup)
4. **Review audit logs** - Regularly check the `audit_log` table for suspicious activity
5. **Monitor login attempts** - Check `login_attempts` table for brute force patterns

### Rate Limiting Configuration

The current limits are:
- **Login**: 5 attempts per 15 minutes per IP
- **API**: 100 requests per 15 minutes per IP

To adjust, modify the rate limiters in [server/server.js](server/server.js#L71-L86):

```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Change window duration
    max: 5, // Change max attempts
    // ...
});
```

### Password Changes

To change the password for user `kat`, connect to the database and update:

```sql
-- Generate new password hash (run in Node.js):
-- bcrypt.hashSync('NewPassword123!', 10)

UPDATE users 
SET password_hash = '$2b$10$...' -- Your new hash here
WHERE username = 'kat';
```

**Better approach**: Add a password change endpoint (future enhancement).

## 📊 Database Tables Added

### `users`
Stores user accounts with hashed passwords.

### `sessions`
Tracks active JWT tokens and their expiration. Allows remote logout.

### `login_attempts`
Logs all login attempts (success/failure) with IP addresses for security monitoring.

### `audit_log`
Comprehensive audit trail of all admin actions.

## 🔍 Monitoring & Troubleshooting

### Check Failed Login Attempts
```sql
SELECT * FROM login_attempts 
WHERE success = 0 
AND attempted_at > datetime('now', '-1 hour')
ORDER BY attempted_at DESC;
```

### Check Active Sessions
```sql
SELECT s.*, u.username 
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > datetime('now') 
AND s.revoked = 0;
```

### View Audit Log
```sql
SELECT a.*, u.username 
FROM audit_log a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 100;
```

### Revoke All Sessions (Force Logout All Users)
```sql
UPDATE sessions SET revoked = 1;
```

## 🚨 Security Headers Details

### X-Frame-Options
- Applied only to admin routes (`/api/auth`, `/api/history`, POST/PUT/DELETE on dishes/meal-plan)
- Public GET endpoints (meal plan, dishes) can still be embedded in iframes as requested
- Prevents clickjacking attacks on sensitive operations

### Content-Security-Policy
Restricts resource loading to prevent XSS:
- Scripts: Only from same origin + inline (for existing code)
- Styles: Only from same origin + inline
- Images: Same origin + data URIs + HTTPS

Adjust in [server/server.js](server/server.js#L25-L30) if needed.

## 📝 Migration from Old System

The old `/api/auth` endpoint (password-only) now returns a 410 Gone status with a deprecation message. All clients must update to use `/api/auth/login` with username and password.

The admin panel has been updated automatically.

## 🎯 Future Enhancements (Optional)

Consider implementing:
- [ ] Password change endpoint for user `kat`
- [ ] Multi-user support (add more users)
- [ ] Role-based access control (admin vs. viewer)
- [ ] Two-factor authentication (2FA)
- [ ] Email notifications for suspicious login attempts
- [ ] Automated session cleanup job
- [ ] Password complexity requirements
- [ ] Account lockout after persistent failed attempts

## ❓ FAQ

**Q: What if I forget the password?**
A: Currently, you'll need to reset it directly in the database. Generate a new hash and update the `users` table.

**Q: Can I have multiple users?**
A: The system supports it, but you'll need to add them manually to the database. Consider building a user management UI.

**Q: How do I change the rate limits?**
A: Edit the `loginLimiter` and `apiLimiter` configurations in `server/server.js`.

**Q: Will my existing tokens work after restart?**
A: If you don't set a persistent `JWT_SECRET`, tokens become invalid on restart (new secret generated). Always set `JWT_SECRET` in production!

**Q: How do I view who's logged in?**
A: Query the `sessions` table (see Monitoring section above).

## 📞 Support

For security concerns or questions, please refer to the main [README.md](README.md) or documentation.
