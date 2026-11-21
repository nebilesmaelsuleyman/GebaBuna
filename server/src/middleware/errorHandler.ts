import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    console.warn(`⚠️ [Validation] ${req.method} ${req.originalUrl}: ${errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`);
    res.status(400).json({
      success: false,
      message: errors[0]?.message || 'Validation failed',
      errors,
    });
    return;
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('💥 [Server Error]:', err);
  else console.warn(`⚠️ [${status}] ${req.method} ${req.originalUrl}: ${err.message}`);

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `Duplicate value entered for ${field}. That value is already registered.`,
    });
    return;
  }

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
};
