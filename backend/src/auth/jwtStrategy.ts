import { Request } from 'express';
import { AuthStrategy } from './strategy';
import { RequestContext } from '../context/requestContext';
import { verifyToken } from '../services/authService';

/**
 * Resolves identity from the access_token httpOnly cookie.
 * Falls back to Bearer Authorization header for backward compatibility
 * with tools like Postman during development.
 */
export class JwtStrategy implements AuthStrategy {
  async resolve(req: Request): Promise<RequestContext | null> {
    // Primary: read from httpOnly cookie (secure, not XSS-readable)
    const cookieToken = req.cookies?.access_token;
    // Fallback: Authorization header (Postman / server-to-server)
    const headerToken = req.headers.authorization?.split(' ')[1];

    const token = cookieToken || headerToken;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    return {
      userId: decoded.id,
      email: decoded.email,
      roleId: decoded.role_id,
      orgId: decoded.org_id,
      permissions: decoded.permissions,
    };
  }
}
