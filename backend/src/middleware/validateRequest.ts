import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log('❌ Validation failed');
      console.log('Body received:', JSON.stringify(req.body, null, 2));
      console.log('Full error:', JSON.stringify(result.error, null, 2));
      const errors = result.error?.errors ?? [];
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next();
  };
}