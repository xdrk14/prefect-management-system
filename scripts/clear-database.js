const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');

// Connect to the database
const dbPath = path.join(__dirname, '../database/prefect_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
    }
});

const houses = ['Aquila', 'Cetus', 'Cygnus', 'Ursa', 'Central'];
const tables = {
    Aquila: { data: 'AquilaPrefectData', offense: 'AquilaOffense', events: 'AquilaEvents' },
    Cetus: { data: 'CetusPrefectData', offense: 'CetusOffenses', events: 'CetusEvents' },
    Cygnus: { data: 'CygnusPrefectData', offense: 'CygnusOffenses', events: 'CygnusEvents' },
    Ursa: { data: 'UrsaPrefectData', offense: 'UrsaOffenses', events: 'UrsaEvents' },
    Central: { data: 'CentralPrefectData', offense: 'CentralOffenses', events: 'CentralEvents' },
};

console.log('--- Database Clearing Script ---');
console.log('Clearing all records from the database at:', dbPath);

db.serialize(() => {
    // Disable foreign keys temporarily to clear all tables without constraint errors
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN TRANSACTION');

    try {
        // Clear house-specific tables
        houses.forEach(h => {
            console.log(`Clearing records for ${h}...`);
            db.run(`DELETE FROM ${tables[h].events}`);
            db.run(`DELETE FROM ${tables[h].offense}`);
            db.run(`DELETE FROM ${tables[h].data}`);
        });

        // Clear global event tables
        console.log('Clearing global events...');
        db.run('DELETE FROM GeneralEvents');
        db.run('DELETE FROM HouseEvents');

        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Error during COMMIT:', err.message);
                db.run('ROLLBACK');
                process.exit(1);
            } else {
                console.log('\n[SUCCESS] All records cleared successfully.');
                console.log('[INFO] Database schema preserved.');
                db.close();
                
                // Attempt to clear server cache
                clearServerCache();
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);
        db.run('ROLLBACK');
        process.exit(1);
    }
});

function clearServerCache() {
    console.log('Attempting to clear server cache...');
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/cache/clear',
        method: 'POST'
    };

    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log('[SUCCESS] Server cache cleared successfully.');
        } else {
            console.log(`[INFO] Server returned status ${res.statusCode}. You may need to restart the server manually.`);
        }
    });

    req.on('error', (e) => {
        console.log('[INFO] Could not reach server to clear cache. If the server is running, please restart it.');
    });

    req.end();
}

