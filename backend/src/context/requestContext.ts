import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId: number;
  email: string;
  roleId: number;
  orgId: number;
  permissions: string[];
}

const als = new AsyncLocalStorage<RequestContext>();

/**
 * Run fn inside a request context. Called once per request by the authenticate middleware.
 * All async operations spawned within fn (including the entire route handler chain)
 * automatically inherit this context via AsyncLocalStorage propagation.
 */
export const runWithContext = (ctx: RequestContext, fn: () => void): void => {
  als.run(ctx, fn);
};

/**
 * Retrieve the context for the current request.
 * Throws if called outside an authenticated request (e.g. in a background job).
 */
export const getContext = (): RequestContext => {
  const ctx = als.getStore();
  if (!ctx) throw new Error('getContext() called outside of a request context');
  return ctx;
};
