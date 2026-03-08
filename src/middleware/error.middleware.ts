import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  Logger.error('Error occurred', err);

  if (err instanceof AppError) {
    return ResponseUtil.error(res, err.message, err.statusCode);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ResponseUtil.badRequest(res, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return ResponseUtil.unauthorized(res, 'Unauthorized access');
  }

  if (err.name === 'ForbiddenError') {
    return ResponseUtil.forbidden(res, 'Access forbidden');
  }

  if (err.name === 'NotFoundError') {
    return ResponseUtil.notFound(res, err.message);
  }

  // Default error response
  return ResponseUtil.error(
    res,
    'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): Response => {
  return ResponseUtil.notFound(res, `Route ${req.originalUrl} not found`);
};
