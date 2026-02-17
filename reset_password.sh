#!/bin/bash
# Password reset script for meal plan application
# Usage: ./reset_password.sh [new_password]

NEW_PASSWORD="${1:-Password123}"

echo "🔐 Resetting password for user 'kat'..."
echo "New password: $NEW_PASSWORD"
echo ""

sudo docker exec -it meal_plan-server-1 node -e "
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/app/database/meals.db');

bcrypt.hash('${NEW_PASSWORD}', 10, (err, hash) => {
    if (err) {
        console.error('❌ Error hashing password:', err);
        db.close();
        process.exit(1);
    }
    
    db.run('UPDATE users SET password_hash = ?, is_active = 1 WHERE username = ?', [hash, 'kat'], (err) => {
        if (err) {
            console.error('❌ Error updating password:', err);
            db.close();
            process.exit(1);
        }
        
        db.run('DELETE FROM login_attempts WHERE username IN (\"kat\", \"Kat\")', (err) => {
            if (err) {
                console.error('❌ Error clearing login attempts:', err);
            } else {
                console.log('✅ Login attempts cleared');
            }
            
            console.log('✅ Password reset successfully');
            console.log('');
            console.log('Login credentials:');
            console.log('  Username: kat');
            console.log('  Password: ${NEW_PASSWORD}');
            db.close();
        });
    });
});
"

echo ""
echo "Done!"
