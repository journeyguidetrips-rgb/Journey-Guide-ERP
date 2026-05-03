import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('📝 PostgreSQL Connection Configuration:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

// Create connection pool with explicit configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection attempts
pool.on('connect', () => {
  console.log('✅ New client connected to pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Test connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL');
    const result = await client.query('SELECT NOW()');
    console.log('   Current time:', result.rows[0].now);
    client.release();
  } catch (error: any) {
    console.error('❌ Failed to connect to PostgreSQL:');
    console.error('   Error:', error.message);
    process.exit(1);
  }
})();

export { pool };