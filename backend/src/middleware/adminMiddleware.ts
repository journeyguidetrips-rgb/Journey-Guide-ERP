// backend/src/middleware/adminMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { getContext } from '../context/requestContext';

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getContext();
    if (!context || context.roleId !== 0) { // Assuming role_id=0 is SuperAdmin
      console.log("403 Here");
      return res.status(403).json({ error: 'Forbidden: SuperAdmin access required' });
    }
    next();
  } catch (err) {
    console.error('Error in isSuperAdmin middleware:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};