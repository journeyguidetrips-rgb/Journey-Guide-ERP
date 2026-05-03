import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './database/connection';
import authRoutes from './routes/auth';
import itineraryRoutes from './routes/itineraries';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  process.exit(0);
});

export { pool };