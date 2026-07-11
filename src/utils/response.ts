import { Response } from 'express';

/** Formato de respuesta uniforme para toda la API: { success, data | message }. */
export function ok(res: Response, data: unknown, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400): Response {
  return res.status(status).json({ success: false, message });
}
