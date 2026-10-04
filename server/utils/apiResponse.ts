import { Response } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public errors: string[];

  constructor(message: string, statusCode = 400, errors: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully',
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = 'An unexpected error occurred',
  statusCode = 400,
  errors: string[] = []
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : [message],
  });
}
