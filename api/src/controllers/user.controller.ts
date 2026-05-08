import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { updateUser, deleteUser } from '../services/auth.service';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        passwordHash: true,
        plan: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const { passwordHash, plan, ...userWithoutHash } = user;
    successResponse(res, { user: { ...userWithoutHash, plan: plan.name, hasPassword: !!passwordHash } });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, name } = req.body;
    const result = await updateUser(req.user!.userId!, { email, password, name });
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

export const deleteMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password } = req.body;
    await deleteUser(req.user!.userId!, password);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    successResponse(res, { message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};
