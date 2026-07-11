import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { fail } from '../utils/response';
import { RolNombre } from '../types';

/**
 * Restringe una ruta a los roles indicados. Debe usarse siempre
 * después del middleware `auth`, que es quien llena req.usuario.
 *
 * Matriz de permisos por sección del panel (ver caso de aplicación):
 *   Dashboard : administrador, finanzas, almacen, marketing
 *   Usuarios  : administrador, marketing
 *   Ordenes   : administrador, finanzas, almacen
 *   Productos : administrador, almacen
 *   Reportes  : administrador, finanzas, marketing
 */
export function requireRole(...rolesPermitidos: RolNombre[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const rol = req.usuario?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      fail(res, 'No tienes permisos para acceder a este recurso', 403);
      return;
    }
    next();
  };
}
