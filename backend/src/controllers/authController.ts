import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import logger from '../config/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      logger.info({ email, userId: result.user.id }, 'Login successful');

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error); // Pass to error handler middleware
    }
  }
}

export default new AuthController();