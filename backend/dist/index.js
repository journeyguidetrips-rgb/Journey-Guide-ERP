"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./database/connection");
Object.defineProperty(exports, "pool", { enumerable: true, get: function () { return connection_1.pool; } });
const auth_1 = __importDefault(require("./routes/auth"));
const itineraries_1 = __importDefault(require("./routes/itineraries"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Handle pool errors
connection_1.pool.on('error', (err) => {
    console.error('❌ Pool error:', err.message);
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        message: 'Server is running',
    };
    try {
        const result = await connection_1.pool.query('SELECT NOW()');
        health.database = 'connected';
        health.message = 'Server and database are healthy ✅';
        res.json(health);
    }
    catch (error) {
        console.error('❌ Health check failed:', error.message);
        health.status = 'degraded';
        health.database = 'disconnected';
        health.message = `Database connection failed: ${error.message}`;
        res.status(503).json(health);
    }
});
// API Routes
app.get('/api', (req, res) => {
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
app.use('/api/auth', auth_1.default);
// Itinerary routes
app.use('/api/itineraries', itineraries_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        status: err.status || 500,
    });
});
// 404 handler
app.use((req, res) => {
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
    await connection_1.pool.end();
    process.exit(0);
});
//# sourceMappingURL=index.js.map