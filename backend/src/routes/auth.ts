import express, { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getAllUsers,
  generateToken,
  updateUserRole,
  deactivateUser,
} from '../services/authService';
import { authenticate, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await registerUser(email, password, firstName, lastName, roleId);

    if (!user) {
      return res.status(400).json({ error: 'Email already exists or registration failed' });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await loginUser(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user (protected)
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      success: true,
      user: req.user,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'Role ID required' });
    }

    const success = await updateUserRole(parseInt(userId), roleId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to update user role' });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user (admin only)
router.delete('/users/:userId', authenticate, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const success = await deactivateUser(parseInt(userId));

    if (!success) {
      return res.status(400).json({ error: 'Failed to deactivate user' });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;