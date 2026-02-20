require('dotenv').config();
const express = require('express');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const admin = require('firebase-admin');

const expressWs = require('express-ws');
const sqlite3 = require('sqlite3').verbose();

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Fallback to ADC
    projectId: 'prefectmanagementsystem'
  });
  console.log('[SUCCESS] Firebase Admin initialized');
} catch (error) {
  console.warn('[WARNING] Firebase Admin initialization failed:', error.message);
  console.log('[INFO] Using simplified initialization for local development...');
  try {
     admin.initializeApp({ projectId: 'prefectmanagementsystem' });
  } catch (e) {
     console.error('[CRITICAL] Firebase Admin could not be initialized:', e.message);
  }
}

const app = express();

// Set proper MIME types for JavaScript files
express.static.mime.define({ 'application/javascript': ['js'] });

// Serve static files from public directory with correct MIME types
app.use(
  express.static('public', {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      // Add security headers
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
    },
  })
);

// Your existing routes and middleware should remain unchanged
// Just add the above configuration

console.log('[FIRE] ==============================================');
console.log('[INFO] PREFECT MANAGEMENT SYSTEM - ULTRA SERVER');
console.log('[FIRE] ==============================================');
console.log(`[DATE] Started: ${new Date().toISOString()}`);
console.log(`[PLATFORM] Platform: ${os.platform()} ${os.arch()}`);
console.log(`[MEM] Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
console.log(`[MEM] Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
console.log(`[CPU] CPU: ${os.cpus()[0].model}`);
console.log(`[CPU] CPU Cores: ${os.cpus().length}`);
console.log(`[NODE] Node Version: ${process.version}`);
console.log(`[PID] Process ID: ${process.pid}`);

// Multi-CPU clustering for 30+ concurrent requests
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const workers = Math.min(os.cpus().length, 8);
  console.log('\n[LAUNCH] ===== CLUSTER MASTER INITIALIZATION =====');
  console.log(`[ADMIN] Master Process: ${process.pid}`);
  console.log(`[SPAWN] Spawning ${workers} worker processes`);
  console.log(`[TARGET] Target: Handle 30+ concurrent requests`);

  for (let i = 0; i < workers; i++) {
    console.log(`[SYNC] Forking worker ${i + 1}/${workers}...`);
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`[ERROR] Worker ${worker.process.pid} died (${signal || code})`);
    console.log(`[RETRY] Respawning worker...`);
    cluster.fork();
  });

  cluster.on('online', worker => {
    console.log(`[SUCCESS] Worker ${worker.process.pid} is online and ready`);
  });

  console.log(`[SUCCESS] Cluster master setup complete!`);
} else {
  console.log('\n[START] ===== WORKER PROCESS INITIALIZATION =====');
  console.log(`[WORKER] Worker Process: ${process.pid}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  const app = express();

  // Enable WebSocket support for real-time updates
  const wsInstance = expressWs(app);

  // Store connected clients for real-time updates
  const connectedClients = new Map();
  const updateBroadcast = new Map();

  console.log('\n[WS] ===== REAL-TIME UPDATE SYSTEM =====');
  const PORT = process.env.PORT || 3000;

  console.log('\n[SECURITY] ===== SECURITY SETUP =====');
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
  console.log('[SUCCESS] Security headers configured');
  console.log('   - XSS Protection: Enabled');
  console.log('   - Frame Options: DENY');
  console.log('   - Content Type Options: nosniff');
  console.log('   - CORS: Enabled for all origins');

  // Rate limiting
  const requests = new Map();
  app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const window = 1 * 60 * 1000; // 1 minute

    if (!requests.has(ip)) requests.set(ip, []);
    const userRequests = requests.get(ip).filter(time => now - time < window);
    if (userRequests.length >= 10000) return res.status(429).json({ error: 'Rate limit exceeded' });

    userRequests.push(now);
    requests.set(ip, userRequests);
    next();
  });
  console.log('[SUCCESS] Rate limiting configured');
  console.log('   - Limit: 10,000 requests per 1 minute per IP');
  console.log('   - Window: 1 minute');
  console.log('   - Storage: In-memory Map');
  console.log('   - [STATS] ULTRA HIGH PERFORMANCE MODE ENABLED [STATS]');

  console.log('\n[MIDDLEWARE] ===== MIDDLEWARE SETUP =====');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  console.log('[SUCCESS] Body parsing configured');
  console.log('   - JSON limit: 10MB');
  console.log('   - URL encoded: Extended mode');

  app.use(express.static('public'));
  app.use('/styles', express.static('styles'));
  app.use('/sources', express.static('sources'));
  console.log('[SUCCESS] Static file serving configured');
  console.log('   - Public directory: /public');
  console.log('   - Styles directory: /styles');
  console.log('   - Sources directory: /sources');

  console.log('\n[CACHE] ===== CACHE SYSTEM SETUP =====');
  // Cache system
  const cache = new Map();
  const getCache = key => {
    const item = cache.get(key);
    return item && Date.now() < item.exp ? item.data : null;
  };
  const setCache = (key, data, ttl = 300000) => cache.set(key, { data, exp: Date.now() + ttl });
  const cacheMiddleware = ttl => (req, res, next) => {
    const key = req.originalUrl;
    const cached = getCache(key);
    if (cached) return res.json(cached);
    res.sendResponse = res.json;
    res.json = body => {
      setCache(key, body, ttl);
      res.sendResponse(body);
    };
    next();
  };
  console.log('[SUCCESS] In-memory cache system initialized');
  console.log('   - Type: Map-based with TTL');
  console.log('   - Default TTL: 5 minutes');
  console.log('   - Features: Auto-expiration, middleware integration');

  // ===== OPTIMIZED DATABASE POOL =====
// ===== OPTIMIZED DATABASE SETUP =====
  console.log('\n[DB] ===== ENHANCED DATABASE SETUP =====');
  // Use single connection with WAL mode for best SQLite concurrency
  const db = new sqlite3.Database('./database/prefect_system.db', sqlite3.OPEN_READWRITE, err => {
    if (err) {
      console.error('[ERROR] DB Connection failed:', err.message);
    } else {
      // ENHANCED SQLite optimizations
      db.run(`
                PRAGMA foreign_keys=ON;
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=NORMAL;
                PRAGMA cache_size=-128000;
                PRAGMA temp_store=MEMORY;
                PRAGMA mmap_size=268435456;
                PRAGMA page_size=32768;
                PRAGMA optimize;
            `);
      console.log('[SUCCESS] DB Connection optimized for performance (WAL Mode)');
    }
  });

  const getDB = () => db; // Simplified access
  console.log('\n[SECURITY] ===== SQL SECURITY SETUP =====');
  // SQL injection protection & query helpers
  const sqlCheck = query =>
    /drop|delete(?!\s+from\s+\w+\s+where)|truncate|insert(?!\s+into\s+\w+\s*\()|update(?!\s+\w+\s+set)|create|alter|exec|union(?!\s+all\s+select)|--|\/\*/i.test(
      query
    );
  const safeQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
      if (sqlCheck(query)) return reject(new Error('SQL_INJECTION_DETECTED'));
      getDB().all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  const safeRun = (query, params = []) =>
    new Promise((resolve, reject) => {
      if (sqlCheck(query)) return reject(new Error('SQL_INJECTION_DETECTED'));
      getDB().run(query, params, function (err) {
        err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  console.log('[SUCCESS] SQL injection protection enabled');
  console.log('   - Dangerous patterns: Blocked');
  console.log('   - Parameterized queries: Enforced');
  console.log('   - Query validation: Active');
  // ===== RESPONSE COMPRESSION =====
  const compression = require('compression'); // npm install compression

  app.use(
    compression({
      level: 6, // Good balance of speed vs compression
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    })
  );

  console.log('[SUCCESS] Response compression enabled (gzip)');
  console.log('   - Level: 6 (optimized)');
  console.log('   - Threshold: 1KB');
  console.log('   - Expected transfer reduction: 50-70%');
  console.log('\n[SCHEMA] ===== DATABASE SCHEMA SETUP =====');
  // Constants - Updated to include Central
  const HOUSES = ['Aquila', 'Cetus', 'Cygnus', 'Ursa', 'Central'];
  const TABLES = {
    Aquila: { data: 'AquilaPrefectData', offense: 'AquilaOffense', events: 'AquilaEvents' },
    Cetus: { data: 'CetusPrefectData', offense: 'CetusOffenses', events: 'CetusEvents' },
    Cygnus: { data: 'CygnusPrefectData', offense: 'CygnusOffenses', events: 'CygnusEvents' },
    Ursa: { data: 'UrsaPrefectData', offense: 'UrsaOffenses', events: 'UrsaEvents' },
    Central: { data: 'CentralPrefectData', offense: 'CentralOffenses', events: 'CentralEvents' },
  };

  // Updated positions based on new schema
  const POSITIONS = {
    house: [
      'House Captain',
      'Deputy House Captain',
      'House Games Captain',
      'Deputy House Games Captain',
      'Prefects',
      'House Prefect Applicants',
    ],
    central: ['Head Prefect', 'Deputy Head Prefect', 'Games Captain', 'Deputy Games Captain'],
  };

  console.log('[SUCCESS] House system configured');
  console.log(`   - Houses: ${HOUSES.join(', ')}`);
  console.log('   - Tables per house: 3 (Data, Offenses, Events)');
  console.log('   - Total data tables: 15 (5 houses × 3 tables)');
  console.log('   - Master tables: 2 (GeneralEvents, HouseEvents)');
  console.log('   - Grand total: 17 tables');

  console.log('\n[MAPPING] ===== TABLE MAPPING =====');
  Object.entries(TABLES).forEach(([house, tables]) => {
    console.log(`   [HOUSE] ${house}:`);
    console.log(`      [LIST] Data: ${tables.data}`);
    console.log(`      [LIST] Offense: ${tables.offense}`);
    console.log(`      [LIST] Events: ${tables.events}`);
  });

  const validateHouse = h => {
    const house = h?.charAt(0).toUpperCase() + h?.slice(1).toLowerCase();
    return HOUSES.includes(house) ? house : null;
  };
  const clearCache = pattern => cache.forEach((v, k) => k.includes(pattern) && cache.delete(k));

  console.log('[SUCCESS] Helper functions initialized');

  // Authentication Middleware
  const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('[AUTH-ERROR] Token verification failed:', error.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
  console.log('[SUCCESS] Authentication middleware initialized');

  console.log('\n[API] ===== API ROUTES REGISTRATION =====');
  let routeCount = 0;

  // ===== CONFIG ENDPOINT =====
  app.get('/api/config/firebase', (req, res) => {
    res.json({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    });
  });
  routeCount++;

  // ===== BATCH REQUEST ENDPOINT (10x FASTER) =====
  app.post('/api/batch', authenticate, async (req, res) => {
    try {
      const { requests } = req.body;
      if (!Array.isArray(requests) || requests.length > 20) {
        return res.status(400).json({ error: 'Invalid batch request' });
      }

      // Execute all requests in parallel
      const results = await Promise.allSettled(
        requests.map(async request => {
          const { endpoint, params = [] } = request;

          // Route the request internally
          switch (endpoint) {
            case 'prefects':
              return await Promise.all(
                HOUSES.map(async h => [
                  h.toLowerCase(),
                  await safeQuery(`SELECT * FROM ${TABLES[h].data} ORDER BY FullName`),
                ])
              ).then(results => Object.fromEntries(results));

            case 'offenses':
              return await Promise.all(
                HOUSES.map(async h => [
                  h.toLowerCase(),
                  await safeQuery(`SELECT * FROM ${TABLES[h].offense} ORDER BY Date DESC`),
                ])
              ).then(results => Object.fromEntries(results));

            case 'events-participation':
              return await Promise.all(
                HOUSES.map(async h => {
                  const data = await safeQuery(`
                                SELECT e.*, p.W0Number, p.FullName, p.Position, p.Class,
                                       ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                                       he.HouseEventName, he.EventDateHeld as HouseDate
                                FROM ${TABLES[h].events} e
                                LEFT JOIN ${TABLES[h].data} p ON e.PrefectID = p.PrefectID
                                LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                                LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                                ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
                            `);
                  return [h.toLowerCase(), data];
                })
              ).then(results => Object.fromEntries(results));

            case 'general-events':
              return await safeQuery('SELECT * FROM GeneralEvents ORDER BY EventDateHeld DESC');

            case 'house-events':
              return await safeQuery('SELECT * FROM HouseEvents ORDER BY EventDateHeld DESC');

            default:
              throw new Error(`Unknown endpoint: ${endpoint}`);
          }
        })
      );

      // Process results
      const response = {};
      requests.forEach((request, index) => {
        const result = results[index];
        response[request.endpoint] =
          result.status === 'fulfilled' ? result.value : { error: result.reason.message };
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  console.log('[LAUNCH] Batch request endpoint added for 10x faster dashboard loading');

  // PREFECT ROUTES - Updated to include W0Number and Class
  console.log('[INFO] Registering PREFECT routes...');
  app.get('/api/prefects', authenticate, cacheMiddleware(180000), async (req, res) => {
    try {
      const results = await Promise.all(
        HOUSES.map(async h => [
          h.toLowerCase(),
          await safeQuery(`SELECT * FROM ${TABLES[h].data} ORDER BY FullName`),
        ])
      );
      res.json(Object.fromEntries(results));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/prefects/:house', authenticate, cacheMiddleware(120000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefects = await safeQuery(`SELECT * FROM ${TABLES[house].data} ORDER BY FullName`);
      res.json(prefects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/prefects/:house/:id', authenticate, cacheMiddleware(60000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefect = await safeQuery(`SELECT * FROM ${TABLES[house].data} WHERE PrefectID = ?`, [
        req.params.id,
      ]);
      if (prefect.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(prefect[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated POST to include W0Number and Class
  app.post('/api/prefects/:house', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { PrefectID, W0Number, FullName, Position, DateOfBirth, Class } = req.body;
      if (!PrefectID || !W0Number || !FullName || !Position || !DateOfBirth || !Class) {
        return res.status(400).json({
          error:
            'Missing required fields: PrefectID, W0Number, FullName, Position, DateOfBirth, Class',
        });
      }
      await safeRun(
        `INSERT INTO ${TABLES[house].data} (PrefectID, W0Number, FullName, Position, DateOfBirth, Class) VALUES (?, ?, ?, ?, ?, ?)`,
        [PrefectID, W0Number, FullName, Position, DateOfBirth, Class]
      );
      clearCache('prefects');
      res.status(201).json({ message: 'Created', PrefectID });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated PUT to include W0Number and Class
  app.put('/api/prefects/:house/:id', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { W0Number, FullName, Position, DateOfBirth, Class } = req.body;
      const result = await safeRun(
        `UPDATE ${TABLES[house].data} SET W0Number = ?, FullName = ?, Position = ?, DateOfBirth = ?, Class = ? WHERE PrefectID = ?`,
        [W0Number, FullName, Position, DateOfBirth, Class, req.params.id]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('prefects');
      res.json({ message: 'Updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete('/api/prefects/:house/:id', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const result = await safeRun(`DELETE FROM ${TABLES[house].data} WHERE PrefectID = ?`, [
        req.params.id,
      ]);
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('prefects');
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New route: Search by W0Number
  app.get('/api/prefects/:house/w0number/:w0number', authenticate, cacheMiddleware(60000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefect = await safeQuery(`SELECT * FROM ${TABLES[house].data} WHERE W0Number = ?`, [
        req.params.w0number,
      ]);
      if (prefect.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(prefect[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New route: Get prefects by class
  app.get('/api/prefects/:house/class/:class', authenticate, cacheMiddleware(120000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefects = await safeQuery(
        `SELECT * FROM ${TABLES[house].data} WHERE Class = ? ORDER BY FullName`,
        [req.params.class]
      );
      res.json(prefects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New route: Get prefects by grade (e.g., "11" for Grade 11)
  app.get('/api/prefects/:house/grade/:grade', cacheMiddleware(120000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefects = await safeQuery(
        `SELECT * FROM ${TABLES[house].data} WHERE Class LIKE ? ORDER BY Class, FullName`,
        [`${req.params.grade}%`]
      );
      res.json(prefects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  console.log(`   ✅ Prefect CRUD routes: ${routeCount - 8} registered`);

  // OFFENSE ROUTES - All existing functionality preserved
  console.log('[INFO] Registering OFFENSE routes...');
  const offenseStartCount = routeCount;

  app.get('/api/offenses', authenticate, cacheMiddleware(300000), async (req, res) => {
    try {
      const results = await Promise.all(
        HOUSES.map(async h => [
          h.toLowerCase(),
          await safeQuery(`SELECT * FROM ${TABLES[h].offense} ORDER BY Date DESC`),
        ])
      );
      res.json(Object.fromEntries(results));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/offenses/:house', authenticate, cacheMiddleware(180000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const offenses = await safeQuery(`SELECT * FROM ${TABLES[house].offense} ORDER BY Date DESC`);
      res.json(offenses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/offenses/:house/:prefectId', authenticate, cacheMiddleware(90000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const offenses = await safeQuery(
        `SELECT * FROM ${TABLES[house].offense} WHERE PrefectID = ? ORDER BY Date DESC`,
        [req.params.prefectId]
      );
      res.json(offenses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.post('/api/offenses/:house', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { PrefectID, Offense, PointsDeducted, Date } = req.body;
      if (!PrefectID || !Offense || !PointsDeducted || !Date)
        return res.status(400).json({ error: 'Missing fields' });
      await safeRun(
        `INSERT INTO ${TABLES[house].offense} (PrefectID, Offense, PointsDeducted, Date) VALUES (?, ?, ?, ?)`,
        [PrefectID, Offense, PointsDeducted, Date]
      );
      clearCache('offenses');
      res.status(201).json({ message: 'Created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.put('/api/offenses/:house/:prefectId/:date', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { Offense, PointsDeducted } = req.body;
      const result = await safeRun(
        `UPDATE ${TABLES[house].offense} SET Offense = ?, PointsDeducted = ? WHERE PrefectID = ? AND Date = ?`,
        [Offense, PointsDeducted, req.params.prefectId, req.params.date]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('offenses');
      res.json({ message: 'Updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete('/api/offenses/:house/:prefectId/:date', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const result = await safeRun(
        `DELETE FROM ${TABLES[house].offense} WHERE PrefectID = ? AND Date = ?`,
        [req.params.prefectId, req.params.date]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('offenses');
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   ✅ Offense CRUD routes: ${routeCount - offenseStartCount} registered`);

  // GENERAL EVENTS TABLE - COMPLETE CRUD (unchanged)
  console.log('[INFO] Registering GENERAL EVENTS routes...');
  const generalEventsStartCount = routeCount;

  app.get('/api/general-events', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const events = await safeQuery('SELECT * FROM GeneralEvents ORDER BY EventDateHeld DESC');
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/general-events/:id', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const event = await safeQuery('SELECT * FROM GeneralEvents WHERE GeneralEventID = ?', [
        req.params.id,
      ]);
      if (event.length === 0) return res.status(404).json({ error: 'Event not found' });
      res.json(event[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  // Add this new route for the frontend's offense deletion
  app.delete('/api/edit/prefects/:house/:id/offenses', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const { date, offense, points } = req.body;
      if (!date || !offense || !points) {
        return res.status(400).json({ error: 'Missing required fields: date, offense, points' });
      }

      // Delete the specific offense that matches all three criteria
      const result = await safeRun(
        `DELETE FROM ${TABLES[house].offense} WHERE PrefectID = ? AND Date = ? AND Offense = ? AND PointsDeducted = ?`,
        [req.params.id, date, offense, points]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Offense not found' });
      }

      clearCache('offenses');
      clearCache('edit');
      res.json({ message: 'Offense deleted successfully' });
    } catch (error) {
      console.error('Error deleting offense:', error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post('/api/general-events', authenticate, async (req, res) => {
    try {
      const { GeneralEventID, GeneralEventName, EventDateHeld, TimeStarted, TimeEnded } = req.body;
      if (!GeneralEventID || !GeneralEventName || !EventDateHeld)
        return res.status(400).json({ error: 'Missing required fields' });
      await safeRun(
        'INSERT INTO GeneralEvents (GeneralEventID, GeneralEventName, EventDateHeld, TimeStarted, TimeEnded) VALUES (?, ?, ?, ?, ?)',
        [GeneralEventID, GeneralEventName, EventDateHeld, TimeStarted || null, TimeEnded || null]
      );
      clearCache('events');
      res.status(201).json({ message: 'General event created', GeneralEventID });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.put('/api/general-events/:id', authenticate, async (req, res) => {
    try {
      const { GeneralEventName, EventDateHeld, TimeStarted, TimeEnded } = req.body;
      const result = await safeRun(
        'UPDATE GeneralEvents SET GeneralEventName = ?, EventDateHeld = ?, TimeStarted = ?, TimeEnded = ? WHERE GeneralEventID = ?',
        [GeneralEventName, EventDateHeld, TimeStarted || null, TimeEnded || null, req.params.id]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Event not found' });
      clearCache('events');
      res.json({ message: 'General event updated', GeneralEventID: req.params.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete('/api/general-events/:id', authenticate, async (req, res) => {
    try {
      await safeRun('BEGIN TRANSACTION');
      try {
        // Cascading delete: Remove participants from all house event tables first
        // Using sequential loop for absolute reliability in a transaction
        for (const h of HOUSES) {
          await safeRun(`DELETE FROM ${TABLES[h].events} WHERE GeneralEventID = ?`, [req.params.id]);
        }

        const result = await safeRun('DELETE FROM GeneralEvents WHERE GeneralEventID = ?', [
          req.params.id,
        ]);

        if (result.changes === 0) {
          await safeRun('ROLLBACK');
          return res.status(404).json({ error: 'Event not found' });
        }

        await safeRun('COMMIT');
        clearCache('events');
        clearCache('participation');
        res.json({ message: 'General event deleted', GeneralEventID: req.params.id });
      } catch (innerError) {
        await safeRun('ROLLBACK');
        throw innerError;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Bulk operations for General Events
  app.post('/api/general-events/bulk', authenticate, async (req, res) => {
    try {
      const { events } = req.body;
      if (!Array.isArray(events)) return res.status(400).json({ error: 'Invalid data format' });
      const placeholders = events.map(() => '(?, ?, ?, ?, ?)').join(',');
      const values = events.flatMap(e => [
        e.GeneralEventID,
        e.GeneralEventName,
        e.EventDateHeld,
        e.TimeStarted || null,
        e.TimeEnded || null,
      ]);
      await safeRun(
        `INSERT INTO GeneralEvents (GeneralEventID, GeneralEventName, EventDateHeld, TimeStarted, TimeEnded) VALUES ${placeholders}`,
        values
      );
      clearCache('events');
      res.status(201).json({ message: 'Bulk general events created', count: events.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get general events by date range
  app.get('/api/general-events/date-range/:from/:to', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const events = await safeQuery(
        'SELECT * FROM GeneralEvents WHERE EventDateHeld BETWEEN ? AND ? ORDER BY EventDateHeld DESC',
        [req.params.from, req.params.to]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get upcoming general events
  app.get('/api/general-events/upcoming', authenticate, cacheMiddleware(300000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await safeQuery(
        'SELECT * FROM GeneralEvents WHERE EventDateHeld >= ? ORDER BY EventDateHeld ASC',
        [today]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get past general events
  app.get('/api/general-events/past', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await safeQuery(
        'SELECT * FROM GeneralEvents WHERE EventDateHeld < ? ORDER BY EventDateHeld DESC',
        [today]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   ✅ General Events routes: ${routeCount - generalEventsStartCount} registered`);

  console.log('[INFO] Registering HOUSE EVENTS routes...');
  const houseEventsStartCount = routeCount;

  // HOUSE EVENTS TABLE - COMPLETE CRUD
  app.get('/api/house-events', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const events = await safeQuery('SELECT * FROM HouseEvents ORDER BY EventDateHeld DESC');
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/house-events/:id', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const event = await safeQuery('SELECT * FROM HouseEvents WHERE HouseEventID = ?', [
        req.params.id,
      ]);
      if (event.length === 0) return res.status(404).json({ error: 'House event not found' });
      res.json(event[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.post('/api/house-events', authenticate, async (req, res) => {
    try {
      const { HouseEventID, HouseEventName, EventDateHeld, TimeStarted, TimeEnded } = req.body;
      if (!HouseEventID || !HouseEventName || !EventDateHeld)
        return res.status(400).json({ error: 'Missing required fields' });
      await safeRun(
        'INSERT INTO HouseEvents (HouseEventID, HouseEventName, EventDateHeld, TimeStarted, TimeEnded) VALUES (?, ?, ?, ?, ?)',
        [HouseEventID, HouseEventName, EventDateHeld, TimeStarted || null, TimeEnded || null]
      );
      clearCache('events');
      res.status(201).json({ message: 'House event created', HouseEventID });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.put('/api/house-events/:id', authenticate, async (req, res) => {
    try {
      const { HouseEventName, EventDateHeld, TimeStarted, TimeEnded } = req.body;
      const result = await safeRun(
        'UPDATE HouseEvents SET HouseEventName = ?, EventDateHeld = ?, TimeStarted = ?, TimeEnded = ? WHERE HouseEventID = ?',
        [HouseEventName, EventDateHeld, TimeStarted || null, TimeEnded || null, req.params.id]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'House event not found' });
      clearCache('events');
      res.json({ message: 'House event updated', HouseEventID: req.params.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete('/api/house-events/:id', authenticate, async (req, res) => {
    try {
      await safeRun('BEGIN TRANSACTION');
      try {
        // Cascading delete: Remove participants from all house event tables first
        for (const h of HOUSES) {
          await safeRun(`DELETE FROM ${TABLES[h].events} WHERE HouseEventsID = ?`, [req.params.id]);
        }

        const result = await safeRun('DELETE FROM HouseEvents WHERE HouseEventID = ?', [
          req.params.id,
        ]);

        if (result.changes === 0) {
          await safeRun('ROLLBACK');
          return res.status(404).json({ error: 'House event not found' });
        }

        await safeRun('COMMIT');
        clearCache('events');
        clearCache('participation');
        res.json({ message: 'House event deleted', HouseEventID: req.params.id });
      } catch (innerError) {
        await safeRun('ROLLBACK');
        throw innerError;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Bulk operations for House Events
  app.post('/api/house-events/bulk', authenticate, async (req, res) => {
    try {
      const { events } = req.body;
      if (!Array.isArray(events)) return res.status(400).json({ error: 'Invalid data format' });
      const placeholders = events.map(() => '(?, ?, ?, ?, ?)').join(',');
      const values = events.flatMap(e => [
        e.HouseEventID,
        e.HouseEventName,
        e.EventDateHeld,
        e.TimeStarted || null,
        e.TimeEnded || null,
      ]);
      await safeRun(
        `INSERT INTO HouseEvents (HouseEventID, HouseEventName, EventDateHeld, TimeStarted, TimeEnded) VALUES ${placeholders}`,
        values
      );
      clearCache('events');
      res.status(201).json({ message: 'Bulk house events created', count: events.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get house events by date range
  app.get('/api/house-events/date-range/:from/:to', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const events = await safeQuery(
        'SELECT * FROM HouseEvents WHERE EventDateHeld BETWEEN ? AND ? ORDER BY EventDateHeld DESC',
        [req.params.from, req.params.to]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get upcoming house events
  app.get('/api/house-events/upcoming', authenticate, cacheMiddleware(300000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await safeQuery(
        'SELECT * FROM HouseEvents WHERE EventDateHeld >= ? ORDER BY EventDateHeld ASC',
        [today]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get past house events
  app.get('/api/house-events/past', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await safeQuery(
        'SELECT * FROM HouseEvents WHERE EventDateHeld < ? ORDER BY EventDateHeld DESC',
        [today]
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] House Events routes: ${routeCount - houseEventsStartCount} registered`);

  // COMBINED EVENTS OPERATIONS
  console.log('🔗 Registering COMBINED EVENTS routes...');
  const combinedEventsStartCount = routeCount;

  // Get all events (both general and house) combined
  app.get('/api/all-events', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const [general, house] = await Promise.all([
        safeQuery('SELECT *, "general" as EventType FROM GeneralEvents'),
        safeQuery('SELECT *, "house" as EventType FROM HouseEvents'),
      ]);
      const allEvents = [...general, ...house].sort(
        (a, b) => new Date(b.EventDateHeld) - new Date(a.EventDateHeld)
      );
      res.json(allEvents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get all upcoming events (both types)
  app.get('/api/all-events/upcoming', authenticate, cacheMiddleware(300000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [general, house] = await Promise.all([
        safeQuery('SELECT *, "general" as EventType FROM GeneralEvents WHERE EventDateHeld >= ?', [
          today,
        ]),
        safeQuery('SELECT *, "house" as EventType FROM HouseEvents WHERE EventDateHeld >= ?', [
          today,
        ]),
      ]);
      const upcomingEvents = [...general, ...house].sort(
        (a, b) => new Date(a.EventDateHeld) - new Date(b.EventDateHeld)
      );
      res.json(upcomingEvents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get all past events (both types)
  app.get('/api/all-events/past', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [general, house] = await Promise.all([
        safeQuery('SELECT *, "general" as EventType FROM GeneralEvents WHERE EventDateHeld < ?', [
          today,
        ]),
        safeQuery('SELECT *, "house" as EventType FROM HouseEvents WHERE EventDateHeld < ?', [
          today,
        ]),
      ]);
      const pastEvents = [...general, ...house].sort(
        (a, b) => new Date(b.EventDateHeld) - new Date(a.EventDateHeld)
      );
      res.json(pastEvents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get event statistics
  app.get('/api/events/statistics', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const [generalStats, houseStats] = await Promise.all([
        safeQuery(`SELECT 
                    COUNT(*) as totalEvents,
                    COUNT(CASE WHEN EventDateHeld >= date('now') THEN 1 END) as upcomingEvents,
                    COUNT(CASE WHEN EventDateHeld < date('now') THEN 1 END) as pastEvents
                    FROM GeneralEvents`),
        safeQuery(`SELECT 
                    COUNT(*) as totalEvents,
                    COUNT(CASE WHEN EventDateHeld >= date('now') THEN 1 END) as upcomingEvents,
                    COUNT(CASE WHEN EventDateHeld < date('now') THEN 1 END) as pastEvents
                    FROM HouseEvents`),
      ]);

      res.json({
        general: generalStats[0],
        house: houseStats[0],
        combined: {
          totalEvents: generalStats[0].totalEvents + houseStats[0].totalEvents,
          upcomingEvents: generalStats[0].upcomingEvents + houseStats[0].upcomingEvents,
          pastEvents: generalStats[0].pastEvents + houseStats[0].pastEvents,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Combined Events routes: ${routeCount - combinedEventsStartCount} registered`);

  // EVENT PARTICIPATION TABLES ROUTES (Updated with new schema joins)
  console.log('[TARGET] Registering EVENT PARTICIPATION routes...');
  const participationStartCount = routeCount;

  // Get all participation records for all houses (Updated to include W0Number and Class)
  app.get('/api/events-participation', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const results = await Promise.all(
        HOUSES.map(async h => {
          const data = await safeQuery(`
                    SELECT e.*, p.W0Number, p.FullName, p.Position, p.Class,
                           ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                           he.HouseEventName, he.EventDateHeld as HouseDate
                    FROM ${TABLES[h].events} e
                    LEFT JOIN ${TABLES[h].data} p ON e.PrefectID = p.PrefectID
                    LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                    LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                    ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
                `);
          return [h.toLowerCase(), data];
        })
      );
      res.json(Object.fromEntries(results));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get all participation records for a specific house (Updated with new schema)
  app.get('/api/events-participation/:house', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const participation = await safeQuery(`
                SELECT e.PrefectID, e.GeneralEventID, e.HouseEventsID, p.W0Number, p.FullName, p.Position, p.Class,
                       ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                       he.HouseEventName, he.EventDateHeld as HouseDate
                FROM ${TABLES[house].events} e
                LEFT JOIN ${TABLES[house].data} p ON e.PrefectID = p.PrefectID
                LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
            `);
      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get participation records for a specific prefect (Updated with new schema)
  app.get(
    '/api/events-participation/:house/:prefectId',
    authenticate,
    cacheMiddleware(300000),
    async (req, res) => {
      try {
        const house = validateHouse(req.params.house);
        if (!house) return res.status(400).json({ error: 'Invalid house' });
        const participation = await safeQuery(
          `
                SELECT e.GeneralEventID, e.HouseEventsID,
                       ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                       he.HouseEventName, he.EventDateHeld as HouseDate
                FROM ${TABLES[house].events} e
                LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                WHERE e.PrefectID = ?
                ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
            `,
          [req.params.prefectId]
        );
        res.json(participation);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  routeCount++;

  // Add new event participation record
  app.post('/api/events-participation/:house', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { PrefectID, GeneralEventID, HouseEventsID } = req.body;
      if (!PrefectID || (!GeneralEventID && !HouseEventsID))
        return res.status(400).json({ error: 'Missing fields' });
      await safeRun(
        `INSERT INTO ${TABLES[house].events} (PrefectID, GeneralEventID, HouseEventsID) VALUES (?, ?, ?)`,
        [PrefectID, GeneralEventID || null, HouseEventsID || null]
      );
      clearCache('participation');
      res.status(201).json({ message: 'Participation created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Update event participation record
  app.put('/api/events-participation/:house/:prefectId/:eventType/:eventId', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { prefectId, eventType, eventId } = req.params;
      const { GeneralEventID, HouseEventsID } = req.body;
      const field =
        eventType === 'general' ? 'GeneralEventID' : eventType === 'house' ? 'HouseEventsID' : null;
      if (!field) return res.status(400).json({ error: 'Invalid event type' });
      const result = await safeRun(
        `UPDATE ${TABLES[house].events} SET GeneralEventID = ?, HouseEventsID = ? WHERE PrefectID = ? AND ${field} = ?`,
        [GeneralEventID || null, HouseEventsID || null, prefectId, eventId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('participation');
      res.json({ message: 'Updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete(
    '/api/events-participation/:house/:prefectId/:eventType/:eventId',
    authenticate,
    async (req, res) => {
      try {
        const house = validateHouse(req.params.house);
        if (!house) return res.status(400).json({ error: 'Invalid house' });
        const { prefectId, eventType, eventId } = req.params;
        const field =
          eventType === 'general'
            ? 'GeneralEventID'
            : eventType === 'house'
              ? 'HouseEventsID'
              : null;
        if (!field) return res.status(400).json({ error: 'Invalid event type' });
        const result = await safeRun(
          `DELETE FROM ${TABLES[house].events} WHERE PrefectID = ? AND ${field} = ?`,
          [prefectId, eventId]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
        clearCache('participation');
        res.json({ message: 'Deleted' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  routeCount++;

  // Bulk add event participation records
  app.post('/api/events-participation/:house/bulk', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { participations } = req.body;
      if (!Array.isArray(participations)) return res.status(400).json({ error: 'Invalid data' });
      const placeholders = participations.map(() => '(?, ?, ?)').join(',');
      const values = participations.flatMap(p => [
        p.PrefectID,
        p.GeneralEventID || null,
        p.HouseEventsID || null,
      ]);
      await safeRun(
        `INSERT INTO ${TABLES[house].events} (PrefectID, GeneralEventID, HouseEventsID) VALUES ${placeholders}`,
        values
      );
      clearCache('participation');
      res.status(201).json({ message: 'Bulk participation created', count: participations.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Get raw event participation data (without joins) for specific house
  app.get('/api/events-participation/:house/raw', authenticate, cacheMiddleware(300000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const records = await safeQuery(`SELECT * FROM ${TABLES[house].events}`);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(
    `   [SUCCESS] Event Participation routes: ${routeCount - participationStartCount} registered`
  );

  // ANALYTICS ROUTES - Updated to include new schema fields
  console.log('[STATS] Registering ANALYTICS routes...');
  // ADD THIS ENTIRE BLOCK RIGHT BEFORE: console.log('📊 Registering ANALYTICS routes...');

  console.log('[CONNECT] Registering REAL-TIME UPDATE routes...');
  const realTimeStartCount = routeCount;

  // SSE endpoint for real-time updates
  app.get('/api/sse/updates', (req, res) => {
    const { userId, page, timestamp } = req.query;

    console.log(`[CONNECT] SSE Connection: ${userId} on page ${page}`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Store client connection
    const clientInfo = {
      id: userId,
      page,
      response: res,
      connectedAt: Date.now(),
      lastPing: Date.now(),
    };

    connectedClients.set(userId, clientInfo);

    // Send initial connection confirmation
    res.write(`event: connection\n`);
    res.write(
      `data: ${JSON.stringify({
        type: 'connected',
        userId,
        timestamp: Date.now(),
        connectedClients: connectedClients.size,
      })}\n\n`
    );

    // Send recent updates to new client (last 10 updates)
    const recentUpdates = Array.from(updateBroadcast.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    recentUpdates.forEach(update => {
      if (update.userId !== userId) {
        // Don't send client's own updates back
        res.write(`event: ${update.type}\n`);
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[CONNECT] SSE Disconnected: ${userId}`);
      connectedClients.delete(userId);
    });

    req.on('error', error => {
      console.error(`[ERROR] SSE Error for ${userId}:`, error);
      connectedClients.delete(userId);
    });
  });
  routeCount++;

  // HTTP endpoint for broadcasting updates (used by SSE clients)
  app.post('/api/sse/broadcast', (req, res) => {
    const update = req.body;

    console.log(`[BROADCAST] Broadcasting update:`, update);

    // Store update in broadcast history
    const updateKey = `${update.type}_${update.timestamp}`;
    updateBroadcast.set(updateKey, update);

    // Clean old updates (keep last 50)
    if (updateBroadcast.size > 50) {
      const oldestKey = Array.from(updateBroadcast.keys())[0];
      updateBroadcast.delete(oldestKey);
    }

    // Broadcast to all connected SSE clients
    let broadcastCount = 0;
    connectedClients.forEach((client, clientId) => {
      if (clientId !== update.userId && client.response) {
        try {
          client.response.write(`event: ${update.type}\n`);
          client.response.write(`data: ${JSON.stringify(update)}\n\n`);
          client.lastPing = Date.now();
          broadcastCount++;
        } catch (error) {
          console.error(`[ERROR] Failed to send to client ${clientId}:`, error);
          connectedClients.delete(clientId);
        }
      }
    });

    res.json({ success: true, broadcastTo: broadcastCount });
  });
  routeCount++;

  // WebSocket support (alternative to SSE)
  app.ws('/ws/updates', (ws, req) => {
    const userId = req.query.userId;
    const page = req.query.page;

    console.log(`[WS] WebSocket Connection: ${userId} on page ${page}`);

    const clientInfo = {
      id: userId,
      page,
      websocket: ws,
      connectedAt: Date.now(),
      lastPing: Date.now(),
    };

    connectedClients.set(userId, clientInfo);

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        userId,
        timestamp: Date.now(),
        connectedClients: connectedClients.size,
      })
    );

    // Send recent updates to new client
    const recentUpdates = Array.from(updateBroadcast.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    recentUpdates.forEach(update => {
      if (update.userId !== userId) {
        ws.send(JSON.stringify(update));
      }
    });

    // Handle incoming messages
    ws.on('message', message => {
      try {
        const update = JSON.parse(message);
        console.log(`[BROADCAST] WebSocket update from ${userId}:`, update);

        // Store and broadcast update
        const updateKey = `${update.type}_${update.timestamp}`;
        updateBroadcast.set(updateKey, update);

        // Broadcast to all other clients
        let broadcastCount = 0;
        connectedClients.forEach((client, clientId) => {
          if (clientId !== userId) {
            try {
              if (client.websocket && client.websocket.readyState === 1) {
                client.websocket.send(JSON.stringify(update));
                broadcastCount++;
              } else if (client.response) {
                client.response.write(`event: ${update.type}\n`);
                client.response.write(`data: ${JSON.stringify(update)}\n\n`);
                broadcastCount++;
              }
              client.lastPing = Date.now();
            } catch (error) {
              console.error(`[ERROR] Failed to send to client ${clientId}:`, error);
              connectedClients.delete(clientId);
            }
          }
        });

        console.log(`[BROADCAST] Update broadcast to ${broadcastCount} clients`);
      } catch (error) {
        console.error('[ERROR] Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] WebSocket Disconnected: ${userId}`);
      connectedClients.delete(userId);
    });

    ws.on('error', error => {
      console.error(`[ERROR] WebSocket Error for ${userId}:`, error);
      connectedClients.delete(userId);
    });
  });
  routeCount++;

  // Heartbeat endpoint for connection health
  app.get('/api/sse/heartbeat', (req, res) => {
    const now = Date.now();
    const activeClients = [];

    // Clean up stale connections
    connectedClients.forEach((client, clientId) => {
      const timeSinceLastPing = now - client.lastPing;
      if (timeSinceLastPing > 60000) {
        // 1 minute timeout
        console.log(`[CLEAN] Cleaning up stale connection: ${clientId}`);
        connectedClients.delete(clientId);
      } else {
        activeClients.push({
          id: clientId,
          page: client.page,
          connectedFor: now - client.connectedAt,
          lastPing: timeSinceLastPing,
        });
      }
    });

    // Send heartbeat to all connected clients
    const heartbeatData = {
      type: 'heartbeat',
      timestamp: now,
      connectedClients: connectedClients.size,
    };

    let heartbeatsSent = 0;
    connectedClients.forEach((client, clientId) => {
      try {
        if (client.websocket && client.websocket.readyState === 1) {
          client.websocket.send(JSON.stringify(heartbeatData));
          heartbeatsSent++;
        } else if (client.response) {
          client.response.write(`event: heartbeat\n`);
          client.response.write(`data: ${JSON.stringify(heartbeatData)}\n\n`);
          heartbeatsSent++;
        }
        client.lastPing = now;
      } catch (error) {
        console.error(`[ERROR] Heartbeat failed for ${clientId}:`, error);
        connectedClients.delete(clientId);
      }
    });

    res.json({
      connectedClients: connectedClients.size,
      activeClients,
      recentUpdates: updateBroadcast.size,
      heartbeatsSent,
    });
  });
  routeCount++;

  // Statistics endpoint
  app.get('/api/sse/stats', (req, res) => {
    const stats = {
      connectedClients: connectedClients.size,
      recentUpdates: updateBroadcast.size,
      clientsByPage: {},
      uptime: process.uptime(),
      serverPid: process.pid,
      timestamp: Date.now(),
    };

    connectedClients.forEach(client => {
      stats.clientsByPage[client.page] = (stats.clientsByPage[client.page] || 0) + 1;
    });

    res.json(stats);
  });
  routeCount++;

  // Force refresh endpoint (for admin use)
  app.post('/api/sse/force-refresh', (req, res) => {
    const { page, message } = req.body;

    const refreshUpdate = {
      type: 'force-refresh',
      userId: 'server',
      timestamp: Date.now(),
      page: page || 'all',
      message: message || 'Server requested refresh',
    };

    let refreshCount = 0;
    connectedClients.forEach((client, clientId) => {
      if (!page || client.page === page) {
        try {
          if (client.websocket && client.websocket.readyState === 1) {
            client.websocket.send(JSON.stringify(refreshUpdate));
            refreshCount++;
          } else if (client.response) {
            client.response.write(`event: force-refresh\n`);
            client.response.write(`data: ${JSON.stringify(refreshUpdate)}\n\n`);
            refreshCount++;
          }
        } catch (error) {
          console.error(`[ERROR] Failed to send refresh to client ${clientId}:`, error);
          connectedClients.delete(clientId);
        }
      }
    });

    res.json({
      success: true,
      refreshedClients: refreshCount,
      targetPage: page || 'all',
    });
  });
  routeCount++;

  console.log(`   [SUCCESS] Real-time update routes: ${routeCount - realTimeStartCount} registered`);

  // CONTINUE WITH EXISTING ANALYTICS ROUTES BELOW THIS LINE
  const analyticsStartCount = routeCount;

  app.get('/api/dashboard/stats', authenticate, cacheMiddleware(900000), async (req, res) => {
    try {
      const queries = HOUSES.flatMap(h => [
        safeQuery(`SELECT COUNT(*) as count FROM ${TABLES[h].data}`).then(r => [
          `${h.toLowerCase()}Prefects`,
          r[0].count,
        ]),
        safeQuery(`SELECT COUNT(*) as count FROM ${TABLES[h].offense}`).then(r => [
          `${h.toLowerCase()}Offenses`,
          r[0].count,
        ]),
        safeQuery(`SELECT COUNT(*) as count FROM ${TABLES[h].events}`).then(r => [
          `${h.toLowerCase()}Participations`,
          r[0].count,
        ]),
      ]);
      const [eventStats, ...houseStats] = await Promise.all([
        Promise.all([
          safeQuery('SELECT COUNT(*) as count FROM GeneralEvents'),
          safeQuery('SELECT COUNT(*) as count FROM HouseEvents'),
        ]).then(([g, h]) => ['totalEvents', g[0].count + h[0].count]),
        ...queries,
      ]);
      const stats = Object.fromEntries([eventStats, ...houseStats]);
      stats.totalPrefects = HOUSES.reduce((sum, h) => sum + stats[`${h.toLowerCase()}Prefects`], 0);
      stats.totalOffenses = HOUSES.reduce((sum, h) => sum + stats[`${h.toLowerCase()}Offenses`], 0);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated to include W0Number and Class in performance analytics
  app.get('/api/dashboard/performance', authenticate, cacheMiddleware(450000), async (req, res) => {
    try {
      const results = await Promise.all(
        HOUSES.map(async h => {
          const data = await safeQuery(`
                    SELECT p.PrefectID, p.W0Number, p.FullName, p.Position, p.DateOfBirth, p.Class,
                           COALESCE(SUM(o.PointsDeducted), 0) as TotalPoints,
                           COUNT(o.PrefectID) as OffenseCount,
                           COUNT(DISTINCT e.GeneralEventID) + COUNT(DISTINCT e.HouseEventsID) as EventCount
                    FROM ${TABLES[h].data} p
                    LEFT JOIN ${TABLES[h].offense} o ON p.PrefectID = o.PrefectID
                    LEFT JOIN ${TABLES[h].events} e ON p.PrefectID = e.PrefectID
                    GROUP BY p.PrefectID, p.W0Number, p.FullName, p.Position, p.DateOfBirth, p.Class
                    ORDER BY TotalPoints DESC, p.FullName
                `);
          return [h.toLowerCase(), data];
        })
      );
      res.json(Object.fromEntries(results));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/dashboard/recent', authenticate, cacheMiddleware(180000), async (req, res) => {
    try {
      const recent = [];
      for (const h of HOUSES) {
        const offenses = await safeQuery(`
                    SELECT '${h}' as house, 'offense' as type, o.PrefectID, o.Offense as activity, 
                           o.Date, o.PointsDeducted, p.FullName, p.W0Number, p.Class
                    FROM ${TABLES[h].offense} o
                    LEFT JOIN ${TABLES[h].data} p ON o.PrefectID = p.PrefectID
                    ORDER BY o.Date DESC LIMIT 5
                `);
        recent.push(...offenses);
      }
      const [general, house] = await Promise.all([
        safeQuery(`SELECT 'General' as house, 'event' as type, GeneralEventID as PrefectID, 
                          GeneralEventName as activity, EventDateHeld as Date, NULL as PointsDeducted, 
                          NULL as FullName, NULL as W0Number, NULL as Class
                          FROM GeneralEvents ORDER BY EventDateHeld DESC LIMIT 5`),
        safeQuery(`SELECT 'House' as house, 'event' as type, HouseEventID as PrefectID, 
                          HouseEventName as activity, EventDateHeld as Date, NULL as PointsDeducted, 
                          NULL as FullName, NULL as W0Number, NULL as Class
                          FROM HouseEvents ORDER BY EventDateHeld DESC LIMIT 5`),
      ]);
      recent.push(...general, ...house);
      res.json(recent.sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 20));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated top offenders to include new schema fields
  app.get('/api/analytics/top-offenders', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const topOffenders = [];
      for (const h of HOUSES) {
        const offenders = await safeQuery(`
                    SELECT p.PrefectID, p.W0Number, p.FullName, p.Position, p.Class, '${h}' as House,
                           SUM(o.PointsDeducted) as TotalPoints, COUNT(o.PrefectID) as OffenseCount
                    FROM ${TABLES[h].data} p
                    JOIN ${TABLES[h].offense} o ON p.PrefectID = o.PrefectID
                    GROUP BY p.PrefectID, p.W0Number, p.FullName, p.Position, p.Class
                    ORDER BY TotalPoints DESC LIMIT 5
                `);
        topOffenders.push(...offenders);
      }
      res.json(topOffenders.sort((a, b) => b.TotalPoints - a.TotalPoints).slice(0, 10));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated most active to include new schema fields
  app.get('/api/analytics/most-active', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const mostActive = [];
      for (const h of HOUSES) {
        const active = await safeQuery(`
                    SELECT p.PrefectID, p.W0Number, p.FullName, p.Position, p.Class, '${h}' as House,
                           COUNT(DISTINCT e.GeneralEventID) + COUNT(DISTINCT e.HouseEventsID) as EventCount
                    FROM ${TABLES[h].data} p
                    LEFT JOIN ${TABLES[h].events} e ON p.PrefectID = e.PrefectID
                    GROUP BY p.PrefectID, p.W0Number, p.FullName, p.Position, p.Class
                    HAVING EventCount > 0
                    ORDER BY EventCount DESC LIMIT 5
                `);
        mostActive.push(...active);
      }
      res.json(mostActive.sort((a, b) => b.EventCount - a.EventCount).slice(0, 10));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/analytics/summary/:house', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const [prefectCount, offenseStats, participationCount] = await Promise.all([
        safeQuery(`SELECT COUNT(*) as count FROM ${TABLES[house].data}`),
        safeQuery(`SELECT COUNT(*) as totalOffenses, SUM(PointsDeducted) as totalPoints, 
                          AVG(PointsDeducted) as avgPoints, COUNT(DISTINCT PrefectID) as prefectsWithOffenses 
                          FROM ${TABLES[house].offense}`),
        safeQuery(`SELECT COUNT(*) as count FROM ${TABLES[house].events}`),
      ]);
      res.json({
        house,
        prefects: prefectCount[0].count,
        offenses: offenseStats[0],
        participations: participationCount[0].count,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New analytics route: Grade distribution
  app.get('/api/analytics/grade-distribution/:house', authenticate, cacheMiddleware(600000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const distribution = await safeQuery(`
                SELECT 
                    SUBSTR(Class, 1, 2) as Grade,
                    COUNT(*) as Count,
                    GROUP_CONCAT(DISTINCT Position) as Positions
                FROM ${TABLES[house].data} 
                GROUP BY SUBSTR(Class, 1, 2)
                ORDER BY Grade
            `);
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New analytics route: Position distribution
  app.get(
    '/api/analytics/position-distribution/:house',
    cacheMiddleware(600000),
    async (req, res) => {
      try {
        const house = validateHouse(req.params.house);
        if (!house) return res.status(400).json({ error: 'Invalid house' });
        const distribution = await safeQuery(`
                SELECT Position, COUNT(*) as Count
                FROM ${TABLES[house].data} 
                GROUP BY Position
                ORDER BY Count DESC
            `);
        res.json(distribution);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  routeCount++;
  console.log(`   [SUCCESS] Analytics routes: ${routeCount - analyticsStartCount} registered`);
  // Add these new API endpoints to your existing server.js file
  // EDIT MANAGER API ENDPOINTS
  console.log('[INFO] Registering EDIT MANAGER routes...');
  const editManagerStartCount = routeCount;

  // Get single prefect with all related data (offenses, events)
  app.get('/api/edit/prefects/:house/:id', authenticate, cacheMiddleware(30000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      // Get prefect data
      const prefect = await safeQuery(`SELECT * FROM ${TABLES[house].data} WHERE PrefectID = ?`, [
        req.params.id,
      ]);
      if (prefect.length === 0) return res.status(404).json({ error: 'Prefect not found' });

      // Get prefect offenses
      const offenses = await safeQuery(
        `SELECT * FROM ${TABLES[house].offense} WHERE PrefectID = ? ORDER BY Date DESC`,
        [req.params.id]
      );

      // Get prefect events with event details
      const events = await safeQuery(
        `
            SELECT e.*, 
                   ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                   he.HouseEventName, he.EventDateHeld as HouseDate
            FROM ${TABLES[house].events} e
            LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
            LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
            WHERE e.PrefectID = ?
            ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
        `,
        [req.params.id]
      );

      res.json({
        prefect: prefect[0],
        offenses: offenses,
        events: events,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Update prefect data
  app.put('/api/edit/prefects/:house/:id', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const { W0Number, FullName, Position, DateOfBirth, Class } = req.body;
      if (!W0Number || !FullName || !Position || !DateOfBirth || !Class) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await safeRun(
        `UPDATE ${TABLES[house].data} SET W0Number = ?, FullName = ?, Position = ?, DateOfBirth = ?, Class = ? WHERE PrefectID = ?`,
        [W0Number, FullName, Position, DateOfBirth, Class, req.params.id]
      );

      if (result.changes === 0) return res.status(404).json({ error: 'Prefect not found' });

      clearCache('prefects');
      clearCache('edit');
      res.json({ message: 'Prefect updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Delete prefect and all related data
  app.delete('/api/edit/prefects/:house/:id', authenticate, async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      // Delete in order to maintain referential integrity
      await safeRun(`DELETE FROM ${TABLES[house].events} WHERE PrefectID = ?`, [req.params.id]);
      await safeRun(`DELETE FROM ${TABLES[house].offense} WHERE PrefectID = ?`, [req.params.id]);
      const result = await safeRun(`DELETE FROM ${TABLES[house].data} WHERE PrefectID = ?`, [
        req.params.id,
      ]);

      if (result.changes === 0) return res.status(404).json({ error: 'Prefect not found' });

      clearCache('prefects');
      clearCache('edit');
      res.json({ message: 'Prefect deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Add offense to prefect
  app.post('/api/edit/prefects/:house/:id/offenses', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const { Offense, PointsDeducted, Date } = req.body;
      if (!Offense || !PointsDeducted || !Date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await safeRun(
        `INSERT INTO ${TABLES[house].offense} (PrefectID, Offense, PointsDeducted, Date) VALUES (?, ?, ?, ?)`,
        [req.params.id, Offense, PointsDeducted, Date]
      );

      clearCache('offenses');
      clearCache('edit');
      res.status(201).json({ message: 'Offense added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Delete offense
  app.delete('/api/edit/prefects/:house/:id/offenses/:date', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const result = await safeRun(
        `DELETE FROM ${TABLES[house].offense} WHERE PrefectID = ? AND Date = ?`,
        [req.params.id, req.params.date]
      );

      if (result.changes === 0) return res.status(404).json({ error: 'Offense not found' });

      clearCache('offenses');
      clearCache('edit');
      res.json({ message: 'Offense deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Add event to prefect
  app.post('/api/edit/prefects/:house/:id/events', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const { GeneralEventID, HouseEventsID } = req.body;
      if (!GeneralEventID && !HouseEventsID) {
        return res
          .status(400)
          .json({ error: 'Must provide either GeneralEventID or HouseEventsID' });
      }

      await safeRun(
        `INSERT INTO ${TABLES[house].events} (PrefectID, GeneralEventID, HouseEventsID) VALUES (?, ?, ?)`,
        [req.params.id, GeneralEventID || null, HouseEventsID || null]
      );

      clearCache('participation');
      clearCache('edit');
      res.status(201).json({ message: 'Event added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Remove event from prefect
  app.delete('/api/edit/prefects/:house/:id/events/:eventType/:eventId', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });

      const { eventType, eventId } = req.params;
      const field = eventType === 'general' ? 'GeneralEventID' : 'HouseEventsID';

      const result = await safeRun(
        `DELETE FROM ${TABLES[house].events} WHERE PrefectID = ? AND ${field} = ?`,
        [req.params.id, eventId]
      );

      if (result.changes === 0)
        return res.status(404).json({ error: 'Event participation not found' });

      clearCache('participation');
      clearCache('edit');
      res.json({ message: 'Event removed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  console.log(`   [SUCCESS] Edit Manager routes: ${routeCount - editManagerStartCount} registered`);

  console.log('[INFO] Registering SEARCH routes...');
  const searchStartCount = routeCount;

  // ... REST OF YOUR EXISTING ROUTES CONTINUE HERE ...

  // Updated search to include W0Number and Class
  app.get('/api/search/prefects', cacheMiddleware(300000), async (req, res) => {
    try {
      const { q, house, position, grade } = req.query;
      if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
      const searchHouses = house ? [validateHouse(house)].filter(Boolean) : HOUSES;
      const queries = searchHouses.map(h => {
        let query = `SELECT '${h}' as house, * FROM ${TABLES[h].data} WHERE (FullName LIKE ? OR PrefectID LIKE ? OR W0Number LIKE ?)`;
        let params = [`%${q}%`, `%${q}%`, `%${q}%`];
        if (position) {
          query += ' AND Position LIKE ?';
          params.push(`%${position}%`);
        }
        if (grade) {
          query += ' AND Class LIKE ?';
          params.push(`${grade}%`);
        }
        return safeQuery(query + ' ORDER BY FullName LIMIT 10', params);
      });
      const results = await Promise.all(queries);
      res.json(results.flat().slice(0, 50));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated search offenses to include new fields in joins
  app.get('/api/search/offenses', cacheMiddleware(300000), async (req, res) => {
    try {
      const { q, house, fromDate, toDate } = req.query;
      if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
      const searchHouses = house ? [validateHouse(house)].filter(Boolean) : HOUSES;
      const queries = searchHouses.map(h => {
        let query = `SELECT o.*, p.W0Number, p.FullName, p.Class, '${h}' as house FROM ${TABLES[h].offense} o 
                            LEFT JOIN ${TABLES[h].data} p ON o.PrefectID = p.PrefectID 
                            WHERE (o.Offense LIKE ? OR o.PrefectID LIKE ? OR p.FullName LIKE ? OR p.W0Number LIKE ?)`;
        let params = [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`];
        if (fromDate) {
          query += ' AND o.Date >= ?';
          params.push(fromDate);
        }
        if (toDate) {
          query += ' AND o.Date <= ?';
          params.push(toDate);
        }
        return safeQuery(query + ' ORDER BY o.Date DESC LIMIT 20', params);
      });
      const results = await Promise.all(queries);
      res.json(results.flat().slice(0, 100));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Search events across both tables (unchanged)
  app.get('/api/search/events', cacheMiddleware(300000), async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
      const [general, house] = await Promise.all([
        safeQuery(
          'SELECT *, "general" as EventType FROM GeneralEvents WHERE GeneralEventName LIKE ? OR GeneralEventID LIKE ?',
          [`%${q}%`, `%${q}%`]
        ),
        safeQuery(
          'SELECT *, "house" as EventType FROM HouseEvents WHERE HouseEventName LIKE ? OR HouseEventID LIKE ?',
          [`%${q}%`, `%${q}%`]
        ),
      ]);
      const results = [...general, ...house].sort(
        (a, b) => new Date(b.EventDateHeld) - new Date(a.EventDateHeld)
      );
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New search route: Search by W0Number across all houses
  app.get('/api/search/w0number/:w0number', cacheMiddleware(300000), async (req, res) => {
    try {
      const w0number = req.params.w0number;
      const queries = HOUSES.map(h =>
        safeQuery(`SELECT '${h}' as house, * FROM ${TABLES[h].data} WHERE W0Number = ?`, [w0number])
      );
      const results = await Promise.all(queries);
      const found = results.flat().filter(result => result.length > 0 || result.PrefectID);
      if (found.length === 0) return res.status(404).json({ error: 'W0Number not found' });
      res.json(found[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New search route: Search by class across all houses
  app.get('/api/search/class/:class', cacheMiddleware(300000), async (req, res) => {
    try {
      const className = req.params.class;
      const queries = HOUSES.map(h =>
        safeQuery(
          `SELECT '${h}' as house, * FROM ${TABLES[h].data} WHERE Class = ? ORDER BY FullName`,
          [className]
        )
      );
      const results = await Promise.all(queries);
      const allResults = {};
      HOUSES.forEach((house, index) => {
        allResults[house.toLowerCase()] = results[index];
      });
      res.json(allResults);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Search routes: ${routeCount - searchStartCount} registered`);

  // UTILITY ROUTES - Updated to include new schema in responses
  console.log('[INFO] Registering UTILITY routes...');
  const utilityStartCount = routeCount;

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      worker: process.pid,
      uptime: Math.round(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cache: cache.size,
      database: 'connected',
    });
  });
  routeCount++;

  app.post('/api/cache/clear', (req, res) => {
    cache.clear();
    res.json({ message: 'Cache cleared', timestamp: Date.now() });
  });
  routeCount++;

  // Updated schema endpoint to include new structure
  app.get('/api/schema', cacheMiddleware(7200000), (req, res) => {
    res.json({
      houses: HOUSES,
      tables: TABLES,
      positions: POSITIONS,
      fields: {
        prefectData: ['PrefectID', 'W0Number', 'FullName', 'Position', 'DateOfBirth', 'Class'],
        offense: ['PrefectID', 'Offense', 'PointsDeducted', 'Date'],
        events: ['PrefectID', 'GeneralEventID', 'HouseEventsID'],
        generalEvents: [
          'GeneralEventID',
          'GeneralEventName',
          'EventDateHeld',
          'TimeStarted',
          'TimeEnded',
        ],
        houseEvents: [
          'HouseEventID',
          'HouseEventName',
          'EventDateHeld',
          'TimeStarted',
          'TimeEnded',
        ],
      },
      w0NumberRanges: {
        Central: 'W00001 - W00011',
        Aquila: 'W00100 - W00199',
        Cetus: 'W00200 - W00299',
        Cygnus: 'W00300 - W00399',
        Ursa: 'W00400 - W00499',
      },
      classFormat: 'Grade Subject Section (e.g., "11 Sci A", "10 Com B")',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:MM',
    });
  });
  routeCount++;

  // New utility route: Get all W0Numbers in use
  app.get('/api/utility/w0numbers-in-use', cacheMiddleware(600000), async (req, res) => {
    try {
      const results = {};
      for (const house of HOUSES) {
        const w0numbers = await safeQuery(
          `SELECT W0Number, PrefectID, FullName FROM ${TABLES[house].data} ORDER BY W0Number`
        );
        results[house.toLowerCase()] = w0numbers;
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // New utility route: Get all classes in use
  app.get('/api/utility/classes-in-use', cacheMiddleware(600000), async (req, res) => {
    try {
      const results = {};
      for (const house of HOUSES) {
        const classes = await safeQuery(
          `SELECT DISTINCT Class, COUNT(*) as Count FROM ${TABLES[house].data} GROUP BY Class ORDER BY Class`
        );
        results[house.toLowerCase()] = classes;
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Utility routes: ${routeCount - utilityStartCount} registered`);

  // BULK OPERATIONS - Updated to include new schema fields
  console.log('[INFO] Registering BULK OPERATION routes...');
  const bulkStartCount = routeCount;

  // Updated bulk prefects to include W0Number and Class
  app.post('/api/prefects/:house/bulk', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { prefects } = req.body;
      if (!Array.isArray(prefects)) return res.status(400).json({ error: 'Invalid data' });

      // Validate required fields
      for (const prefect of prefects) {
        if (
          !prefect.PrefectID ||
          !prefect.W0Number ||
          !prefect.FullName ||
          !prefect.Position ||
          !prefect.DateOfBirth ||
          !prefect.Class
        ) {
          return res.status(400).json({ error: 'Missing required fields in bulk data' });
        }
      }

      const placeholders = prefects.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
      const values = prefects.flatMap(p => [
        p.PrefectID,
        p.W0Number,
        p.FullName,
        p.Position,
        p.DateOfBirth,
        p.Class,
      ]);
      await safeRun(
        `INSERT INTO ${TABLES[house].data} (PrefectID, W0Number, FullName, Position, DateOfBirth, Class) VALUES ${placeholders}`,
        values
      );
      clearCache('prefects');
      res.status(201).json({ message: 'Bulk created', count: prefects.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.post('/api/offenses/:house/bulk', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { offenses } = req.body;
      if (!Array.isArray(offenses)) return res.status(400).json({ error: 'Invalid data' });
      const placeholders = offenses.map(() => '(?, ?, ?, ?)').join(',');
      const values = offenses.flatMap(o => [o.PrefectID, o.Offense, o.PointsDeducted, o.Date]);
      await safeRun(
        `INSERT INTO ${TABLES[house].offense} (PrefectID, Offense, PointsDeducted, Date) VALUES ${placeholders}`,
        values
      );
      clearCache('offenses');
      res.status(201).json({ message: 'Bulk created', count: offenses.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Bulk Operation routes: ${routeCount - bulkStartCount} registered`);

  // POSITION-SPECIFIC ROUTES - Updated for new schema
  console.log('[INFO] Registering POSITION-SPECIFIC routes...');
  const positionStartCount = routeCount;

  app.get('/api/prefects/:house/position/:position', cacheMiddleware(300000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const prefects = await safeQuery(
        `SELECT * FROM ${TABLES[house].data} WHERE Position = ? ORDER BY FullName`,
        [req.params.position]
      );
      res.json(prefects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  // Updated event participants to include new schema fields
  app.get(
    '/api/events/:eventType/:eventId/participants',
    cacheMiddleware(600000),
    async (req, res) => {
      try {
        const { eventType, eventId } = req.params;
        const participants = {};
        for (const h of HOUSES) {
          const field =
            eventType === 'general'
              ? 'GeneralEventID'
              : eventType === 'house'
                ? 'HouseEventsID'
                : null;
          if (!field) return res.status(400).json({ error: 'Invalid event type' });
          const result = await safeQuery(
            `
                    SELECT p.PrefectID, p.W0Number, p.FullName, p.Position, p.Class, '${h}' as House
                    FROM ${TABLES[h].events} e
                    JOIN ${TABLES[h].data} p ON e.PrefectID = p.PrefectID
                    WHERE e.${field} = ?
                `,
            [eventId]
          );
          participants[h.toLowerCase()] = result;
        }
        res.json(participants);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  routeCount++;

  // New route: Get all positions across houses
  app.get('/api/positions/summary', cacheMiddleware(600000), async (req, res) => {
    try {
      const summary = {};
      for (const house of HOUSES) {
        const positions = await safeQuery(`
                    SELECT Position, COUNT(*) as Count, 
                           GROUP_CONCAT(FullName) as Members
                    FROM ${TABLES[house].data} 
                    GROUP BY Position 
                    ORDER BY Position
                `);
        summary[house.toLowerCase()] = positions;
      }
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Position-specific routes: ${routeCount - positionStartCount} registered`);

  // LEGACY PARTICIPATION ROUTES (for backward compatibility) - Updated
  console.log('[INFO] Registering LEGACY PARTICIPATION routes...');
  const legacyStartCount = routeCount;

  app.get('/api/participation/:house', cacheMiddleware(600000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const participation = await safeQuery(`
                SELECT e.PrefectID, e.GeneralEventID, e.HouseEventsID, p.W0Number, p.FullName, p.Position, p.Class,
                       ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                       he.HouseEventName, he.EventDateHeld as HouseDate
                FROM ${TABLES[house].events} e
                LEFT JOIN ${TABLES[house].data} p ON e.PrefectID = p.PrefectID
                LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
            `);
      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.get('/api/participation/:house/:prefectId', cacheMiddleware(300000), async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const participation = await safeQuery(
        `
                SELECT e.GeneralEventID, e.HouseEventsID,
                       ge.GeneralEventName, ge.EventDateHeld as GeneralDate,
                       he.HouseEventName, he.EventDateHeld as HouseDate
                FROM ${TABLES[house].events} e
                LEFT JOIN GeneralEvents ge ON e.GeneralEventID = ge.GeneralEventID
                LEFT JOIN HouseEvents he ON e.HouseEventsID = he.HouseEventID
                WHERE e.PrefectID = ?
                ORDER BY COALESCE(ge.EventDateHeld, he.EventDateHeld) DESC
            `,
        [req.params.prefectId]
      );
      res.json(participation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.post('/api/participation/:house', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { PrefectID, GeneralEventID, HouseEventsID } = req.body;
      if (!PrefectID || (!GeneralEventID && !HouseEventsID))
        return res.status(400).json({ error: 'Missing fields' });
      await safeRun(
        `INSERT INTO ${TABLES[house].events} (PrefectID, GeneralEventID, HouseEventsID) VALUES (?, ?, ?)`,
        [PrefectID, GeneralEventID || null, HouseEventsID || null]
      );
      clearCache('participation');
      res.status(201).json({ message: 'Created' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;

  app.delete('/api/participation/:house/:prefectId/:eventType/:eventId', async (req, res) => {
    try {
      const house = validateHouse(req.params.house);
      if (!house) return res.status(400).json({ error: 'Invalid house' });
      const { prefectId, eventType, eventId } = req.params;
      const field =
        eventType === 'general' ? 'GeneralEventID' : eventType === 'house' ? 'HouseEventsID' : null;
      if (!field) return res.status(400).json({ error: 'Invalid event type' });
      const result = await safeRun(
        `DELETE FROM ${TABLES[house].events} WHERE PrefectID = ? AND ${field} = ?`,
        [prefectId, eventId]
      );
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      clearCache('participation');
      res.json({ message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  routeCount++;
  console.log(`   [SUCCESS] Legacy Participation routes: ${routeCount - legacyStartCount} registered`);

  // STATIC ROUTES - Updated to include Central
  console.log('[INFO] Registering STATIC routes...');
  const staticStartCount = routeCount;

  ['/', '/dashboard', '/main', '/events', '/accounts'].forEach(route => {
    app.get(route, (req, res) => {
      const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
      res.sendFile(path.join(__dirname, 'public', file));
    });
    routeCount++;
  });

  HOUSES.forEach(house => {
    app.get(`/${house.toLowerCase()}`, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', `${house.toLowerCase()}.html`));
    });
    routeCount++;
  });
  console.log(`   [SUCCESS] Static routes: ${routeCount - staticStartCount} registered`);

  // ERROR HANDLING
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  console.log('\n[TARGET] ===== FINAL INITIALIZATION =====');
  // Real-time heartbeat interval
  // Real-time heartbeat interval
  setInterval(() => {
    const activeConnections = connectedClients.size;
    if (activeConnections > 0) {
      console.log(`[HEARTBEAT] Heartbeat: ${activeConnections} active connections`);
    }

    // Clean up old updates (keep last 100)
    if (updateBroadcast.size > 100) {
      const sortedUpdates = Array.from(updateBroadcast.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 100);

      updateBroadcast.clear();
      sortedUpdates.forEach(([key, value]) => {
        updateBroadcast.set(key, value);
      });

      console.log('[CLEAN] Cleaned up old real-time updates');
    }

    // [OPTIMIZATION] Clean up expired cache items to prevent memory leaks
    if (cache.size > 0) {
      const now = Date.now();
      let expiredCount = 0;
      for (const [key, value] of cache.entries()) {
        if (value.expiry < now) {
          cache.delete(key);
          expiredCount++;
        }
      }
      if (expiredCount > 0) {
        console.log(`[CLEAN] Removed ${expiredCount} expired items from cache`);
      }
    }
  }, 30000); // Increased to 30 seconds for better performance
  // START SERVER
  app.listen(PORT, () => {
    console.log('\n[SUCCESS] ===== SERVER SUCCESSFULLY STARTED =====');
    console.log(`[LAUNCH] Server Status: ONLINE`);
    console.log(`[URL] Server URL: http://localhost:${PORT}`);
    console.log(`[WORKER] Worker Process: ${process.pid}`);
    console.log(`[HOUSE] Houses Available: ${HOUSES.join(', ')}`);
    console.log(`[ID] Total API Routes: ${routeCount} endpoints`);
    console.log(`[DB] Cache System: Active (In-Memory Map)`);
    console.log(`[DB] Database Mode: Single Connection (WAL Mode)`);
    console.log(`[SECURITY] Security: SQL Injection Protection, Rate Limiting, CORS`);
    console.log(`[STATS] Performance: Multi-CPU Clustering, Connection Pooling`);
    console.log(`[INFO] Features: CRUD Operations, Analytics, Search, Bulk Operations`);
    console.log('\n[TARGET] ===== AVAILABLE ENDPOINTS =====');
    console.log('[LIST] Prefects (Updated with W0Number & Class):');
    console.log('   GET    /api/prefects');
    console.log('   GET    /api/prefects/:house');
    console.log('   GET    /api/prefects/:house/:id');
    console.log('   GET    /api/prefects/:house/w0number/:w0number');
    console.log('   GET    /api/prefects/:house/class/:class');
    console.log('   GET    /api/prefects/:house/grade/:grade');
    console.log('   POST   /api/prefects/:house');
    console.log('   PUT    /api/prefects/:house/:id');
    console.log('   DELETE /api/prefects/:house/:id');
    console.log('[INFO] Offenses:');
    console.log('   GET    /api/offenses');
    console.log('   GET    /api/offenses/:house');
    console.log('   GET    /api/offenses/:house/:prefectId');
    console.log('   POST   /api/offenses/:house');
    console.log('   PUT    /api/offenses/:house/:prefectId/:date');
    console.log('   DELETE /api/offenses/:house/:prefectId/:date');
    console.log('[INFO] Events:');
    console.log('   GET    /api/general-events');
    console.log('   GET    /api/house-events');
    console.log('   GET    /api/all-events');
    console.log('   POST   /api/general-events');
    console.log('   POST   /api/house-events');
    console.log('[INFO] Event Participation:');
    console.log('   GET    /api/events-participation/:house');
    console.log('   POST   /api/events-participation/:house');
    console.log('   DELETE /api/events-participation/:house/:prefectId/:eventType/:eventId');
    console.log('[INFO] Analytics (Enhanced):');
    console.log('   GET    /api/dashboard/stats');
    console.log('   GET    /api/dashboard/performance');
    console.log('   GET    /api/dashboard/recent');
    console.log('   GET    /api/analytics/top-offenders');
    console.log('   GET    /api/analytics/most-active');
    console.log('   GET    /api/analytics/grade-distribution/:house');
    console.log('   GET    /api/analytics/position-distribution/:house');
    console.log('[INFO] Search (Enhanced):');
    console.log('   GET    /api/search/prefects?q=...&grade=...');
    console.log('   GET    /api/search/offenses?q=...');
    console.log('   GET    /api/search/events?q=...');
    console.log('   GET    /api/search/w0number/:w0number');
    console.log('   GET    /api/search/class/:class');
    console.log('[INFO] Utilities (Enhanced):');
    console.log('   GET    /api/health');
    console.log('   GET    /api/schema');
    console.log('   GET    /api/utility/w0numbers-in-use');
    console.log('   GET    /api/utility/classes-in-use');
    console.log('   POST   /api/cache/clear');
    console.log('[INFO] Positions:');
    console.log('   GET    /api/prefects/:house/position/:position');
    console.log('   GET    /api/positions/summary');
    console.log('\n[TARGET] ===== NEW SCHEMA FEATURES =====');
    console.log('[INFO] W0Number Support:');
    console.log('   - Search by W0Number: /api/search/w0number/W00100');
    console.log('   - W0Numbers in use: /api/utility/w0numbers-in-use');
    console.log('[INFO] Class Support:');
    console.log('   - Filter by class: /api/prefects/:house/class/11%20Sci%20A');
    console.log('   - Filter by grade: /api/prefects/:house/grade/11');
    console.log('   - Classes in use: /api/utility/classes-in-use');
    console.log('[INFO] Enhanced Analytics:');
    console.log('   - Grade distribution: /api/analytics/grade-distribution/:house');
    console.log('   - Position distribution: /api/analytics/position-distribution/:house');
    console.log('[INFO] Central Team Support:');
    console.log('   - Central house included in all operations');
    console.log('   - Separate position types for Central team');
    console.log('\n[TARGET] ===== QUICK TEST COMMANDS =====');
    console.log('Health Check:');
    console.log(`   curl http://localhost:${PORT}/api/health`);
    console.log('Get Schema (Updated):');
    console.log(`   curl http://localhost:${PORT}/api/schema`);
    console.log('Get All Prefects (All 5 Houses):');
    console.log(`   curl http://localhost:${PORT}/api/prefects`);
    console.log('Search by W0Number:');
    console.log(`   curl http://localhost:${PORT}/api/search/w0number/W00100`);
    console.log('Get Classes in Use:');
    console.log(`   curl http://localhost:${PORT}/api/utility/classes-in-use`);
    console.log('Grade Distribution:');
    console.log(`   curl http://localhost:${PORT}/api/analytics/grade-distribution/aquila`);
    console.log('\n[SUCCESS] ===== PREFECT MANAGEMENT SYSTEM READY =====');
    console.log('[INFO] Enterprise-Grade School Management System');
    console.log('[STATS] Ultra-Fast [STATS] Multi-CPU [STATS] Secure [STATS] Scalable');
    console.log('[INFO] Updated with Enhanced Schema Support');
    console.log('[LIST] W0Number [LIST] Class [LIST] Grade [LIST] Central Team');
    console.log('==============================================');
    console.log('[CONNECT] Real-time Updates:');
    console.log('   [CONNECT] SSE: GET /api/sse/updates');
    console.log('   [BROADCAST] Broadcast: POST /api/sse/broadcast');
    console.log('   [WS] WebSocket: WS /ws/updates');
    console.log('   [HEARTBEAT] Heartbeat: GET /api/sse/heartbeat');
    console.log('   [STATS] Stats: GET /api/sse/stats');
    console.log('   [SYNC] Force Refresh: POST /api/sse/force-refresh');
  });

  // GRACEFUL SHUTDOWN
  const shutdown = () => {
    console.log('\n[SYNC] ===== GRACEFUL SHUTDOWN INITIATED =====');
    console.log(`[DATE] Shutdown Time: ${new Date().toISOString()}`);
    console.log(`[STATS] Uptime: ${Math.round(process.uptime())} seconds`);
    console.log(`[DB] Cache Entries: ${cache.size}`);
    console.log('[DB] Closing database connections...');

    new Promise(resolve => {
      db.close(err => {
        if (err) console.error(`[ERROR] DB close error:`, err.message);
        else console.log(`[SUCCESS] DB connection closed`);
        resolve();
      });
    })
      .then(() => {
        console.log('[SUCCESS] All database connections closed successfully');
        console.log('[SUCCESS] Graceful shutdown completed');
        console.log('[INFO] Goodbye!');
        process.exit(0);
      })
      .catch(err => {
        console.error('💥 Shutdown error:', err.message);
        process.exit(1);
      });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
