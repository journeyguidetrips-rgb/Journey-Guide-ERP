"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log('📝 PostgreSQL Connection Configuration:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
// Create connection pool with explicit configuration
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool = pool;
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
    }
    catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:');
        console.error('   Error:', error.message);
        process.exit(1);
    }
})();
//# sourceMappingURL=connection.js.map