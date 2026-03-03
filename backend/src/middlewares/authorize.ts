/**
 * Authorization middleware — checks if user has required role(s).
 * 
 * Usage: Add after authenticate middleware
 * router.get('/admin-only', authenticate, authorize(['superadmin']), controller.method);
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import logger from '../config/logger';

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is authenticated (should be set by authenticate middleware)
    if (!req.user) {
      logger.warn({ path: req.path }, 'Authorization attempted without authentication');
      return next(new AppError('Authentication required', 401));
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, role: req.user.role, allowedRoles, path: req.path },
        'Access denied: insufficient permissions'
      );
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
