import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    // Stable machine-readable identifier clients can branch on.
    public code?: string,
  ) {
    super(message);
    this.name = 'App Error';
  }
}

export const ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      ...(err.code && { code: err.code }),
      message: err.message,
    });
  }
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
