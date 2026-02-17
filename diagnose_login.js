// Diagnostic script to troubleshoot login issues
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'server', 'database', 'meals.db');

console.log('🔍 Login Diagnostic Tool\n');
console.log(`Database path: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database\n');
    runDiagnostics();
});

function runDiagnostics() {
    // Step 1: Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('❌ Error checking for users table:', err);
            db.close();
            return;
        }
        
        if (!row) {
            console.error('❌ Users table does not exist!');
            console.log('💡 Run the migration: node server/server.js (it will auto-create on startup)');
            db.close();
            return;
        }
        
        console.log('✅ Users table exists\n');
        checkUsers();
    });
}

function checkUsers() {
    // Step 2: List all users
    db.all('SELECT id, username, display_name, is_active, created_at, last_login FROM users', (err, users) => {
        if (err) {
            console.error('❌ Error querying users:', err);
            db.close();
            return;
        }
        
        if (users.length === 0) {
            console.error('❌ No users found in database!');
            console.log('💡 The initial user should be created on server startup');
            console.log('💡 Try restarting the server');
            db.close();
            return;
        }
        
        console.log(`📋 Found ${users.length} user(s):\n`);
        users.forEach(user => {
            console.log(`   Username: ${user.username}`);
            console.log(`   Display Name: ${user.display_name}`);
            console.log(`   Active: ${user.is_active ? 'Yes' : 'No ⚠️'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log(`   Last Login: ${user.last_login || 'Never'}`);
            console.log();
        });
        
        checkLoginAttempts(users[0].username);
    });
}

function checkLoginAttempts(username) {
    // Step 3: Check recent login attempts
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    db.all(
        `SELECT username, ip_address, success, attempted_at 
         FROM login_attempts 
         WHERE username = ? AND attempted_at > ?
         ORDER BY attempted_at DESC
         LIMIT 10`,
        [username, fifteenMinutesAgo],
        (err, attempts) => {
            if (err) {
                console.error('❌ Error querying login attempts:', err);
                db.close();
                return;
            }
            
            const failedCount = attempts.filter(a => !a.success).length;
            
            console.log('🔒 Recent Login Attempts (last 15 minutes):');
            if (attempts.length === 0) {
                console.log('   No recent attempts\n');
            } else {
                console.log(`   Total: ${attempts.length}, Failed: ${failedCount}\n`);
                attempts.forEach(attempt => {
                    const status = attempt.success ? '✅ Success' : '❌ Failed';
                    console.log(`   ${status} - ${attempt.attempted_at} from ${attempt.ip_address}`);
                });
                console.log();
                
                if (failedCount >= 5) {
                    console.log('⚠️  WARNING: Account is locked due to too many failed attempts!');
                    console.log('💡 Wait 15 minutes or clear the login_attempts table\n');
                }
            }
            
            promptPasswordTest();
        }
    );
}

function promptPasswordTest() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('🔐 Password Verification Test\n');
    
    readline.question('Enter username to test (default: kat): ', (username) => {
        username = username.trim() || 'kat';
        
        readline.question('Enter password to test: ', (password) => {
            readline.close();
            
            if (!password) {
                console.log('\n❌ No password provided');
                cleanupAndExit();
                return;
            }
            
            testPassword(username, password);
        });
    });
}

function testPassword(username, password) {
    db.get(
        'SELECT id, username, password_hash, is_active FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err) {
                console.error('\n❌ Error finding user:', err);
                cleanupAndExit();
                return;
            }
            
            if (!user) {
                console.log(`\n❌ User '${username}' not found`);
                cleanupAndExit();
                return;
            }
            
            console.log(`\n✅ User '${username}' found`);
            console.log(`   Active: ${user.is_active ? 'Yes' : 'No ⚠️'}`);
            
            if (!user.is_active) {
                console.log('⚠️  User account is INACTIVE!');
                console.log('💡 Activate with: UPDATE users SET is_active = 1 WHERE username = "kat";\n');
            }
            
            try {
                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                
                if (passwordMatch) {
                    console.log('✅ Password MATCHES! Login should work.\n');
                    console.log('💡 If login still fails, check:');
                    console.log('   1. Browser console for errors');
                    console.log('   2. Network tab to see the actual request/response');
                    console.log('   3. Server logs for more details');
                } else {
                    console.log('❌ Password DOES NOT MATCH!\n');
                    console.log('💡 To reset password, you can:');
                    console.log('   1. Stop the server');
                    console.log('   2. Run: node reset_password.js');
                    console.log('   Or manually with bcrypt to generate a new hash');
                }
            } catch (err) {
                console.error('❌ Error comparing password:', err);
            }
            
            console.log('\n📊 Password Hash Info:');
            console.log(`   Hash: ${user.password_hash.substring(0, 30)}...`);
            console.log(`   Length: ${user.password_hash.length} characters`);
            console.log(`   Valid bcrypt format: ${user.password_hash.startsWith('$2') ? 'Yes' : 'No ⚠️'}`);
            
            cleanupAndExit();
        }
    );
}

function cleanupAndExit() {
    console.log('\n🏁 Diagnostic complete');
    db.close();
}
