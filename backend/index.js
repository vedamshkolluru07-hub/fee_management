require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./server');
const sessionMiddleware = require('./config/session.js');
const initSchema = require('./database/schema');
const seedInitialUsers = require('./config/seed');
const allowedOrigins = require('./config/allowedOrigins.js');
// Jobs
const startAuthCleanupJob = require('./job/authCleanupJob');
const startLoginAttemptsCleanupJob = require('./job/loginAttemptsCleanupJob');
const startNotificationCleanupJob = require('./job/notificationCleanupJob');
const startUserCleanupJob = require('./job/userCleanupJob');

const PORT = process.env.PORT || 5000;

// ======================================================
// CREATE HTTP SERVER (IMPORTANT FOR SOCKET.IO)
// ======================================================
const server = http.createServer(app);

// ======================================================
// ATTACH SOCKET.IO
// ======================================================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow non-browser clients / same-origin requests with no origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('🚫 [Socket.IO] CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ======================================================
// SHARE THE EXPRESS SESSION WITH SOCKET.IO
// ------------------------------------------------------
// This lets every socket read `socket.request.session.user`,
// the same object attachUser.js reads on normal HTTP requests.
// Without this, sockets have no idea who is connected and the
// client would have to tell the server "I am user X" — which
// can be forged. With this, identity comes from the signed
// session cookie, not from client-supplied data.
// ======================================================
io.engine.use(sessionMiddleware);

// Load socket handlers
require('./sockets/socket')(io);

const appSettingsRepo = require('./modules/user_management/repositories/appSettingsRepository.js');


// ======================================================
// INITIALIZE SYSTEM
// ======================================================
async function initializeApp() {
  try {
    console.log('🚀 Initializing system...');

    // 1. DB schema
    await initSchema();
    console.log('✅ Database schema initialized');

    // 2. Seed data
    await seedInitialUsers();
    console.log('🌱 Seed data initialized');

    await appSettingsRepo.initializeDefaults();
    console.log(' app settings default initialized ');
    // 3. Start jobs
    startAuthCleanupJob();
    startLoginAttemptsCleanupJob();
    startNotificationCleanupJob();
    startUserCleanupJob();

    console.log('✅ Background jobs started');

    // 4. Start server
    server.listen(PORT, () => {
      console.log('====================================');
      console.log('🚀 Server Started Successfully');
      console.log(`🌐 Port      : ${PORT}`);
      console.log(`📅 Time      : ${new Date().toISOString()}`);
      console.log('====================================');
    });

  } catch (err) {
    console.error('❌ Initialization failed:', err);
    process.exit(1);
  }
}

// ======================================================
// GLOBAL ERROR HANDLERS
// ======================================================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// ======================================================
// BOOT APP
// ======================================================
initializeApp();