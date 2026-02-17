// Password reset utility
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, 'server', 'database', 'meals.db');

console.log('🔐 Password Reset Tool\n');
console.log(`Database path: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database\n');
    listUsersAndReset();
});

function listUsersAndReset() {
    // First, list all users
    db.all('SELECT id, username, display_name, is_active FROM users', (err, users) => {
        if (err) {
            console.error('❌ Error querying users:', err);
            db.close();
            return;
        }
        
        if (users.length === 0) {
            console.error('❌ No users found in database!');
            db.close();
            return;
        }
        
        console.log('📋 Available users:\n');
        users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.username} (${user.display_name}) - ${user.is_active ? 'Active' : 'Inactive'}`);
        });
        console.log();
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('Enter username to reset password (default: kat): ', (username) => {
            username = username.trim() || 'kat';
            
            rl.question('Enter new password: ', (password) => {
                rl.question('Confirm new password: ', (confirmPassword) => {
                    rl.close();
                    
                    if (password !== confirmPassword) {
                        console.log('\n❌ Passwords do not match!');
                        db.close();
                        return;
                    }
                    
                    if (password.length < 8) {
                        console.log('\n⚠️  Warning: Password is less than 8 characters');
                    }
                    
                    resetPassword(username, password);
                });
            });
        });
    });
}

function resetPassword(username, password) {
    // Check if user exists
    db.get('SELECT id, username FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('\n❌ Error finding user:', err);
            db.close();
            return;
        }
        
        if (!user) {
            console.log(`\n❌ User '${username}' not found`);
            db.close();
            return;
        }
        
        // Hash the new password
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('\n❌ Error hashing password:', err);
                db.close();
                return;
            }
            
            // Update the password
            db.run(
                'UPDATE users SET password_hash = ?, is_active = 1 WHERE username = ?',
                [hash, username],
                (err) => {
                    if (err) {
                        console.error('\n❌ Error updating password:', err);
                        db.close();
                        return;
                    }
                    
                    console.log(`\n✅ Password successfully reset for user '${username}'`);
                    console.log('✅ Account activated');
                    
                    // Clear failed login attempts
                    db.run(
                        'DELETE FROM login_attempts WHERE username = ?',
                        [username],
                        (err) => {
                            if (err) {
                                console.error('⚠️  Warning: Could not clear login attempts:', err);
                            } else {
                                console.log('✅ Cleared failed login attempts');
                            }
                            
                            // Revoke all existing sessions for security
                            db.run(
                                'UPDATE sessions SET revoked = 1 WHERE user_id = ?',
                                [user.id],
                                (err) => {
                                    if (err) {
                                        console.error('⚠️  Warning: Could not revoke sessions:', err);
                                    } else {
                                        console.log('✅ Revoked all existing sessions');
                                    }
                                    
                                    console.log('\n🎉 Password reset complete!');
                                    console.log('💡 You can now log in with the new password\n');
                                    db.close();
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}
