// src/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create and export the connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});