import type { Response } from 'express';

export function sendData<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function pageNumber(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
