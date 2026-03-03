import prisma from '../prisma/client';
import { User } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role?: string;
    organisationId?: string;
    departmentId?: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }
}

export default new UserRepository();