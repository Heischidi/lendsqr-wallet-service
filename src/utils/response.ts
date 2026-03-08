import { Response } from 'express';
import { IApiResponse } from '../types';

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: IApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: string
  ): Response {
    const response: IApiResponse<null> = {
      success: false,
      message,
      error,
    };
    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string }>,
    message: string = 'Validation failed'
  ): Response {
    const response: IApiResponse<null> = {
      success: false,
      message,
      errors,
    };
    return res.status(400).json(response);
  }

  static created<T>(res: Response, data: T, message: string = 'Created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static badRequest(res: Response, message: string = 'Bad request'): Response {
    return this.error(res, message, 400);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static conflict(res: Response, message: string = 'Conflict'): Response {
    return this.error(res, message, 409);
  }
}
