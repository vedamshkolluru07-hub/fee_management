// ======================================================
// server.js — Modular Express App (Clean Architecture)
// ======================================================

require('dotenv').config();

const allowedOrigins = require('./config/allowedOrigins.js');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// Session (shared instance — also used by Socket.IO in index.js)
const sessionMiddleware = require('./config/session.js');

// Middleware
const errorHandler = require('./middlewares/errorHandler.js');
const { generalLimiter } = require('./middlewares/rateLimiter.js');

const app = express();

/* ======================================================
   SECURITY HEADERS (Helmet)
====================================================== */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ======================================================
   STATIC FILES
====================================================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ======================================================
   CORS CONFIG
====================================================== */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('🚫 CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* ======================================================
   BODY PARSER
====================================================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ======================================================
   SESSION (shared with Socket.IO — see index.js)
====================================================== */
app.use(sessionMiddleware);

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

/* ======================================================
   API ROOT
====================================================== */
app.get('/api', (req, res) => {
  res.json({
    message: 'School Management API',
    version: '1.0.0',
  });
});

/* ======================================================
   RATE LIMITER
====================================================== */
app.use(generalLimiter);

/* ======================================================
   🔐 ACADEMIC MANAGEMENT MODULE ROUTES
====================================================== */

// Academic (CREATE / READ / UPDATE / DELETE split modules)
const academicCreateRoutes =
  require('./modules/academic_management/routes/createRoutes.js');

const academicReadRoutes =
  require('./modules/academic_management/routes/readRoutes.js');

const academicUpdateRoutes =
  require('./modules/academic_management/routes/updateRoutes.js');

const academicCascadeDeleteRoutes =
  require('./modules/academic_management/routes/cascadeDelete.routes.js');

/* Mount Academic Routes */
app.use('/api/academicManagement', academicCreateRoutes);
app.use('/api/academicManagement', academicReadRoutes);
app.use('/api/academicManagement/update', academicUpdateRoutes);
app.use('/api/academicManagement', academicCascadeDeleteRoutes);

/* ======================================================
   👨‍🎓 STUDENT MANAGEMENT MODULE ROUTES (ADDED FIX)
====================================================== */

const bulkStudentRoutes =
  require('./modules/student_management/routes/bulkStudentRoutes.js');

const deleteStudentRoutes =
  require('./modules/student_management/routes/deleteStudentRoutes.js');

const getStudentRoutes =
  require('./modules/student_management/routes/getStudentRoutes.js');

const studentEnrollmentRoutes =
  require('./modules/student_management/routes/studentEnrollmentRoutes.js');

const studentRoutes =
  require('./modules/student_management/routes/studentRoutes.js');

/* Mount Student Routes */
app.use('/api/students', bulkStudentRoutes);
app.use('/api/students', deleteStudentRoutes);
app.use('/api/students', getStudentRoutes);
app.use('/api/students', studentEnrollmentRoutes);
app.use('/api/students', studentRoutes);

/* ======================================================
   📅 CALENDAR MANAGEMENT MODULE ROUTES
====================================================== */
const calendarRoutes =
  require('./modules/calander_management/routes/calendarRoutes.js');

const postponementRoutes =
  require('./modules/calander_management/routes/postponementRoutes.js');

app.use('/api/calendar', calendarRoutes);
app.use('/api/calendar', postponementRoutes);

/* ======================================================
   🌐 WEBSITE MANAGEMENT MODULE ROUTES (Public site CMS)
====================================================== */

const homeBlocksRoutes =
  require('./modules/website_management/routes/homeBlocksRoutes.js');

const aboutBlocksRoutes =
  require('./modules/website_management/routes/aboutBlocksRoutes.js');

const enquiryRoutes =
  require('./modules/website_management/routes/enquiryRoutes.js');

const enquiryTypeRoutes =
  require('./modules/website_management/routes/enquiryTypeRoutes.js');

const connectLinksRoutes =
  require('./modules/website_management/routes/connectLinksRoutes.js');

const siteThemeRoutes =
  require('./modules/website_management/routes/siteThemeRoutes.js');

const websiteUploadRoutes =
  require('./modules/website_management/routes/uploadRoutes.js');

/* Mount Website Management Routes */
app.use('/api/website/home', homeBlocksRoutes);
app.use('/api/website/about', aboutBlocksRoutes);
app.use('/api/website/enquiries', enquiryRoutes);
app.use('/api/website/enquiry-types', enquiryTypeRoutes);
app.use('/api/website/connect-links', connectLinksRoutes);
app.use('/api/website/theme', siteThemeRoutes);
app.use('/api/website/upload', websiteUploadRoutes);

/* ======================================================
   🔐 USER MANAGEMENT MODULE ROUTES
====================================================== */

const appSettingsRoutes =
  require('./modules/user_management/routes/appSettingsRoutes.js');

const auditLogRoutes =
  require('./modules/user_management/routes/auditLogRoutes.js');

const authRoutes =
  require('./modules/user_management/routes/authRoutes.js');

const deviceSessionRoutes =
  require('./modules/user_management/routes/deviceSessionRoutes.js');

const loginAttemptsRoutes =
  require('./modules/user_management/routes/loginAttemptsRoutes.js');

const otpRoutes =
  require('./modules/user_management/routes/otpRoutes.js');

const passwordResetRoutes =
  require('./modules/user_management/routes/passwordResetRoutes.js');

const tokenRoutes =
  require('./modules/user_management/routes/tokenRoutes.js');

const userRoutes =
  require('./modules/user_management/routes/userRoutes.js');

const notificationsRoutes =
  require('./modules/user_management/routes/notificationsRoutes.js');

/* Mount User Routes */
app.use('/api/settings', appSettingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', deviceSessionRoutes);
app.use('/api/login-attempts', loginAttemptsRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/token', tokenRoutes);

app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRoutes);

/* ======================================================
   💳 PAYMENTS MODULE ROUTES
====================================================== */

const transactionBooksRoutes =
  require('./modules/payments_interactions/routes/transactionBooksRoutes.js');

const transactionUniformsRoutes =
  require('./modules/payments_interactions/routes/transactionUniformsRoutes.js');

const tuitionTransactionsRoutes =
  require('./modules/payments_interactions/routes/tuitionTransactionsRoutes.js');

const familyPendingRoutes =
  require('./modules/payments_interactions/routes/familyPendingRoutes.js');

const promoteRoutes =
  require('./modules/payments_interactions/routes/promoteRoutes.js');

const studentClasses =
  require('./modules/payments_interactions/routes/studentClassRoutes.js');

/* Mount Payment Routes */
app.use('/api/payments/books', transactionBooksRoutes);
app.use('/api/payments/uniforms', transactionUniformsRoutes);
app.use('/api/payments/tuition', tuitionTransactionsRoutes);
app.use('/api/payments/family-pending', familyPendingRoutes);
app.use('/api/payments', studentClasses);
app.use('/api/students', promoteRoutes);

/* ======================================================
   404 HANDLER
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */
app.use(errorHandler);

/* ======================================================
   EXPORT APP
====================================================== */
module.exports = app;