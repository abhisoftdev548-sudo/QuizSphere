import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const notFound: RequestHandler = (req, _res, next) => next(new ApiError(404, `Route ${req.method} ${req.path} was not found.`, 'NOT_FOUND'));

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please review the highlighted fields.', details: error.flatten() } });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
    res.status(409).json({ success: false, error: { code: 'DUPLICATE_RECORD', message: 'A record with these details already exists.' } });
    return;
  }
  if (process.env.NODE_ENV !== 'production') console.error(error);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
};
