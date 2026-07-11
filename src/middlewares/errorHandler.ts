import { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/response';

/** Error de negocio con código HTTP explícito, para lanzar desde controladores/modelos. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Middleware final de Express: captura cualquier error no manejado y responde en formato uniforme. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    fail(res, err.message, err.status);
    return;
  }

  console.error(err);
  fail(res, 'Error interno del servidor', 500);
}
