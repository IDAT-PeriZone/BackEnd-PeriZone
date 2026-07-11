import { Response } from 'express';
import * as direccionesModel from '../models/direcciones.model';
import { ok, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth';

export async function listar(req: AuthRequest, res: Response): Promise<Response> {
  const direcciones = await direccionesModel.listarPorUsuario(req.usuario!.id);
  return ok(res, direcciones);
}

export async function crear(req: AuthRequest, res: Response): Promise<Response> {
  const { direccion, distrito, provincia, departamento, referencia, predeterminada } = req.body;
  if (!direccion || !distrito) {
    return fail(res, 'direccion y distrito son obligatorios', 422);
  }

  const id = await direccionesModel.crear({
    id_usuario: req.usuario!.id,
    direccion,
    distrito,
    provincia,
    departamento,
    referencia,
    predeterminada,
  });
  return ok(res, { id }, 201);
}

export async function actualizar(req: AuthRequest, res: Response): Promise<Response> {
  const existente = await direccionesModel.buscarPorId(Number(req.params.id));
  if (!existente || existente.id_usuario !== req.usuario!.id) {
    return fail(res, 'Dirección no encontrada', 404);
  }

  await direccionesModel.actualizar(Number(req.params.id), req.usuario!.id, req.body);
  return ok(res, { mensaje: 'Dirección actualizada' });
}

export async function eliminar(req: AuthRequest, res: Response): Promise<Response> {
  await direccionesModel.eliminar(Number(req.params.id), req.usuario!.id);
  return ok(res, { mensaje: 'Dirección eliminada' });
}
