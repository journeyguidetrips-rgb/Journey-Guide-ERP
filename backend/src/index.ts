import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { pool } from './database/connection';
import { authenticate, setAuthStrategy } from './middleware/authMiddleware';
import { JwtStrategy } from './auth/jwtStrategy';
import authRoutes from './routes/auth';
import itineraryRoutes from './routes/itineraries';
import bookingsRoutes from './routes/bookings';
import vendorRoutes from './routes/vendors';
import settingsRoutes from './routes/settings';
import adminRouter from './routes/admin';

// Load environment variables
dotenv.config();

// Register auth strategy — swap this one line to change the auth mechanism (e.g. OAuthStrategy)
setAuthStrategy(new JwtStrategy());

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
});

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' is not allowed`));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// CSRF double-submit cookie protection:
// Auth routes (/api/auth/*) are exempt — login/register/refresh have no cookie yet.
// All other state-mutating requests must send the X-CSRF-Token header matching the csrf_token cookie.
const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!mutating.includes(req.method)) return next();

  const cookieCsrf = req.cookies?.csrf_token as string | undefined;
  const headerCsrf = req.headers['x-csrf-token'] as string | undefined;

  if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
    res.status(403).json({ error: 'Invalid or missing CSRF token' });
    return;
  }
  next();
};
// Apply CSRF check to all /api routes that are NOT under /api/auth
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/auth/')) return next();
  csrfProtection(req, res, next);
});

// General API rate limiter — applied to all /api routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health Check Endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'disconnected',
    message: 'Server is running',
  };

  try {
    const result = await pool.query('SELECT NOW()');
    health.database = 'connected';
    health.message = 'Server and database are healthy ✅';
    res.json(health);
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    health.status = 'degraded';
    health.database = 'disconnected';
    health.message = `Database connection failed: ${error.message}`;
    res.status(503).json(health);
  }
});

// API Routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Journey Guide ERP API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      itineraries: '/api/itineraries',
      payments: '/api/payments',
      files: '/api/files',
      logs: '/api/logs',
    },
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Itinerary routes
app.use('/api/itineraries', itineraryRoutes);

// Bookings route
app.use('/api/bookings', bookingsRoutes);

// Vendor routes
app.use('/api/vendors', vendorRoutes);

// Settings routes (admin-only)
app.use('/api/settings', settingsRoutes);

// Add admin routes
app.use('/api/admin', adminRouter);

// Authenticated file serving — replaces the removed public /uploads static route
app.get('/api/files/:filename', authenticate, (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename); // strip any path traversal
  const filePath = path.join(process.cwd(), 'uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(filePath);
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📄 Itinerary API: http://localhost:${PORT}/api/itineraries\n`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { pool };