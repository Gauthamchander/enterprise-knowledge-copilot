/**
 * Authentication middleware — verifies JWT token and attaches user to request.
 * 
 * Usage: Add to routes that require authentication
 * router.get('/protected', authenticate, controller.method);
 */
import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import userRepository from '../repositories/userRepository';
import { AppError } from './errorHandler';
import logger from '../config/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organisationId: string | null;
        departmentId: string | null;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify token and get user info
    const { userId, email } = await authService.verifyToken(token);

    // Fetch full user from database to get role and other info
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Type assertion to get role
    const userWithRole = user as unknown as {
      id: string;
      email: string;
      role: string;
      organisationId: string | null;
      departmentId: string | null;
    };

    // Attach user to request object
    req.user = {
      id: userWithRole.id,
      email: userWithRole.email,
      role: userWithRole.role,
      organisationId: userWithRole.organisationId ?? null,
      departmentId: userWithRole.departmentId ?? null,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error({ error }, 'Authentication middleware error');
    next(new AppError('Authentication failed', 401));
  }
};
