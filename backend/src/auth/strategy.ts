import { Request } from 'express';
import { RequestContext } from '../context/requestContext';

/**
 * Implement this interface to add a new auth mechanism (OAuth, API keys, etc.).
 * Return a populated RequestContext on success, or null if the request is not authenticated.
 * The authenticate middleware calls this once per request — nothing else changes.
 */
export interface AuthStrategy {
  resolve(req: Request): Promise<RequestContext | null>;
}
