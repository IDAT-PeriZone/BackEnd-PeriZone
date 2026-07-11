import { Response } from 'express';
import * as comprobantesModel from '../models/comprobantes.model';
import * as ordenesModel from '../models/ordenes.model';
import { ok, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth';

const ROLES_ADMIN = ['administrador', 'finanzas', 'almacen'] as const;

/** El comprobante se genera automáticamente en el checkout (ver ordenes.controller). Aquí solo se consulta. */
export async function obtenerPorOrden(req: AuthRequest, res: Response): Promise<Response> {
  const idOrden = Number(req.params.idOrden);

  const orden = await ordenesModel.buscarPorId(idOrden);
  if (!orden) return fail(res, 'Orden no encontrada', 404);

  const esDueno = orden.id_usuario === req.usuario!.id;
  const esAdmin = ROLES_ADMIN.includes(req.usuario!.rol as (typeof ROLES_ADMIN)[number]);
  if (!esDueno && !esAdmin) return fail(res, 'No tienes acceso a este comprobante', 403);

  const comprobante = await comprobantesModel.buscarPorOrden(idOrden);
  if (!comprobante) return fail(res, 'Esta orden todavía no tiene comprobante generado', 404);

  return ok(res, comprobante);
}
