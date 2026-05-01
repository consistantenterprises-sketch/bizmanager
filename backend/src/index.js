require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initFirebase } = require('./lib/firebase');
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');
const customerRoutes = require('./routes/customers');
const stockRoutes = require('./routes/stock');
const expenseRoutes = require('./routes/expenses');
const depositRoutes = require('./routes/deposits');
const bookingRoutes = require('./routes/bookings');
const feedbackRoutes = require('./routes/feedback');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');

// Init Firebase Admin
initFirebase();

const app = express();
app.set('trust proxy', 1);

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS — only allow your frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Vite dev server
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting — 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth routes get stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts.' },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0',() => console.log(`BizManager API running on port ${PORT}`));
