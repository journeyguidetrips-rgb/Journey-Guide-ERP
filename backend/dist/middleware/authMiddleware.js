"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authorize = exports.authenticate = void 0;
const authService_1 = require("../services/authService");
// Authentication middleware - verify JWT token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = (0, authService_1.verifyToken)(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
};
exports.authenticate = authenticate;
// Authorization middleware - check if user has specific permission
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const hasPermission = requiredPermissions.some((permission) => req.user.permissions.includes(permission));
        if (!hasPermission) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.authorize = authorize;
// Check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role_id !== 1) { // 1 is admin role
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=authMiddleware.js.map