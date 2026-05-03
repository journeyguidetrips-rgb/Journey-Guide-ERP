"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authService_1 = require("../services/authService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, roleId } = req.body;
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const user = await (0, authService_1.registerUser)(email, password, firstName, lastName, roleId);
        if (!user) {
            return res.status(400).json({ error: 'Email already exists or registration failed' });
        }
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const user = await (0, authService_1.loginUser)(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = (0, authService_1.generateToken)({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            permissions: user.permissions || [],
        });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                roleName: user.role_name,
                permissions: user.permissions,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get current user (protected)
router.get('/me', authMiddleware_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        res.json({
            success: true,
            user: req.user,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all users (admin only)
router.get('/users', authMiddleware_1.authenticate, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const users = await (0, authService_1.getAllUsers)();
        res.json({
            success: true,
            users,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update user role (admin only)
router.put('/users/:userId/role', authMiddleware_1.authenticate, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;
        if (!roleId) {
            return res.status(400).json({ error: 'Role ID required' });
        }
        const success = await (0, authService_1.updateUserRole)(parseInt(userId), roleId);
        if (!success) {
            return res.status(400).json({ error: 'Failed to update user role' });
        }
        res.json({
            success: true,
            message: 'User role updated successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Deactivate user (admin only)
router.delete('/users/:userId', authMiddleware_1.authenticate, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const success = await (0, authService_1.deactivateUser)(parseInt(userId));
        if (!success) {
            return res.status(400).json({ error: 'Failed to deactivate user' });
        }
        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map