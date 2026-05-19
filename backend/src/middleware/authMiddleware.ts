import { Request, Response, NextFunction } from 'express';
import { AuthStrategy } from '../auth/strategy';
import { runWithContext, getContext, RequestContext } from '../context/requestContext';

// Extend Express Request so existing code that reads req.user still compiles
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role_id: number;
        org_id: number;
        permissions: string[];
      };
    }
  }
}

let _strategy: AuthStrategy | null = null;

/** Register the auth strategy once at startup (called in index.ts). */
export const setAuthStrategy = (strategy: AuthStrategy): void => {
  _strategy = strategy;
};

/**
 * Authentication middleware.
 * Resolves the user via the registered AuthStrategy, then sets the AsyncLocalStorage
 * context so every service called during this request can access the user via getContext()
 * without any userId parameter threading.
 *
 * To add OAuth: implement AuthStrategy, call setAuthStrategy(new OAuthStrategy()) in index.ts.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!_strategy) {
    res.status(500).json({ error: 'Auth strategy not configured' });
    return;
  }

  const ctx = await _strategy.resolve(req);
  if (!ctx) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Populate req.user for backward compatibility with any code that reads it directly
  req.user = {
    id: ctx.userId,
    email: ctx.email,
    role_id: ctx.roleId,
    org_id: ctx.orgId,
    permissions: ctx.permissions,
  };

  // All async work spawned inside this callback (the entire route handler chain)
  // automatically inherits ctx via AsyncLocalStorage
  runWithContext(ctx, () => next());
};

/** Permission check middleware — reads from context, no req.user needed */
export const authorize = (requiredPermissions: string[]) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const ctx = getContext();
    const allowed = requiredPermissions.some(p => ctx.permissions.includes(p));
    if (!allowed) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

/** Admin-only middleware — reads from context */
export const isAdmin = (_req: Request, res: Response, next: NextFunction): void => {
  const ctx = getContext();
  if (ctx.roleId !== 1) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
