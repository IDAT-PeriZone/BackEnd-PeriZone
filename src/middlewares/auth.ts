import { NextFunction, Request, Response } from 'express';
import { verificarToken } from '../utils/jwt';
import { fail } from '../utils/response';
import { JwtPayload } from '../types';

/** Request con el usuario ya autenticado adjunto por el middleware `auth`. */
export interface AuthRequest extends Request {
  usuario?: JwtPayload;
}

/**
 * Verifica el header "Authorization: Bearer <token>" y adjunta el
 * payload del usuario a req.usuario. Corta la petición con 401 si no
 * hay token o es inválido/expirado.
 */
export function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    fail(res, 'Token no proporcionado', 401);
    return;
  }

  const token = header.substring('Bearer '.length);
  try {
    req.usuario = verificarToken(token);
    next();
  } catch {
    fail(res, 'Token inválido o expirado', 401);
  }
}
