import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role_id: number;
        permissions: string[];
      };
    }
  }
}

// Authentication middleware - verify JWT token
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Authorization middleware - check if user has specific permission
export const authorize = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasPermission = requiredPermissions.some((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role_id !== 1) { // 1 is admin role
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};