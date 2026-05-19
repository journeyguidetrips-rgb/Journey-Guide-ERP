import crypto from 'crypto';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  authenticate,
  isAdmin,
} from '../middleware/authMiddleware';
import {
  registerUser,
  loginUser,
  getAllUsers,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  getUserWithPermissions,
  updateUserRole,
  deactivateUser,
} from '../services/authService';

const IS_PROD = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_MS  = 15 * 60 * 1000;          // 15 minutes
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
});

const router = express.Router();

/** Helper: set all three cookies (access, refresh, csrf) */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_MS,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MS,
  });

  // csrf_token is NOT httpOnly — JS reads it and sends as X-CSRF-Token header
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MS,
  });
}

/** Helper: clear all auth cookies */
function clearAuthCookies(res: Response): void {
  const opts = { httpOnly: true, secure: IS_PROD, sameSite: 'strict' as const };
  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
  res.clearCookie('csrf_token', { ...opts, httpOnly: false });
}

// Register new user
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, roleId, orgId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await registerUser(email, password, firstName, lastName, roleId, orgId);

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

// Login — sets httpOnly cookies, returns user info (no token in body)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await loginUser(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role_id: user.role_id,
      org_id: user.org_id,
      permissions: user.permissions || [],
    });

    const refreshToken = generateRefreshToken(user.id);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
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

// Refresh — issues a new access token using the refresh_token cookie
router.post('/refresh', authLimiter, async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    const user = await getUserWithPermissions(payload.userId);
    if (!user || !user.is_active) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role_id: user.role_id,
      org_id: user.org_id,
      permissions: user.permissions || [],
    });

    const newRefreshToken = generateRefreshToken(user.id);
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({ success: true, message: 'Token refreshed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout — clears all auth cookies
router.post('/logout', async (req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

// Get current user (protected) — returns full user profile for client-side rehydration
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserWithPermissions(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      success: true,
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
