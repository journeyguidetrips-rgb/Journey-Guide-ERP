import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './database/connection';
import authRoutes from './routes/auth';
import itineraryRoutes from './routes/itineraries';
import bookingsRoutes from './routes/bookings';

// Load environment variables
dotenv.config();

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

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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