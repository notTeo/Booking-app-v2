import { Response } from 'express';

export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
) => {
  return res.status(statusCode).json({
    status: 'success',
    data,
  });
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 400,
) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
};