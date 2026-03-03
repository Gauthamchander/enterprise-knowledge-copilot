import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import userRepository from '../repositories/userRepository';
import { AppError } from '../middlewares/errorHandler';
import logger from '../config/logger';

export interface LoginResult {
  user: {
    id: string;
    email: string;
    role: string;
    organisationId: string | null;
    departmentId: string | null;
  };
  accessToken: string;
}

// Type for User with organisationId and departmentId
type UserWithIds = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  organisationId: string | null;
  departmentId: string | null;
};

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      logger.warn({ email }, 'Login attempt with non-existent email');
      throw new AppError('Invalid email or password', 401);
    }

    // Type assertion to include organisationId and departmentId
    // Using double assertion because Prisma types may be out of sync
    const userWithIds = user as unknown as UserWithIds;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userWithIds.passwordHash);

    if (!isPasswordValid) {
      logger.warn({ email, userId: userWithIds.id }, 'Login attempt with invalid password');
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const accessToken = this.generateAccessToken(userWithIds.id, userWithIds.email);

    logger.info({ email, userId: userWithIds.id }, 'User logged in successfully');

    return {
      user: {
        id: userWithIds.id,
        email: userWithIds.email,
        role: userWithIds.role,
        organisationId: userWithIds.organisationId ?? null,
        departmentId: userWithIds.departmentId ?? null,
      },
      accessToken,
    };
  }

  private generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export default new AuthService();