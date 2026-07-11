import { Response, Request } from 'express';
import * as categoriasModel from '../models/categorias.model';
import { ok, fail } from '../utils/response';

export async function listar(_req: Request, res: Response): Promise<Response> {
  const categorias = await categoriasModel.listar();
  return ok(res, categorias);
}

export async function obtener(req: Request, res: Response): Promise<Response> {
  const categoria = await categoriasModel.buscarPorId(Number(req.params.id));
  if (!categoria) return fail(res, 'Categoría no encontrada', 404);
  return ok(res, categoria);
}

export async function crear(req: Request, res: Response): Promise<Response> {
  const { nombre, descripcion } = req.body;
  if (!nombre) return fail(res, 'nombre es obligatorio', 422);
  const id = await categoriasModel.crear(nombre, descripcion);
  const categoria = await categoriasModel.buscarPorId(id);
  return ok(res, categoria, 201);
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  const { nombre, descripcion } = req.body;
  await categoriasModel.actualizar(Number(req.params.id), nombre, descripcion);
  const categoria = await categoriasModel.buscarPorId(Number(req.params.id));
  return ok(res, categoria);
}

export async function eliminar(req: Request, res: Response): Promise<Response> {
  await categoriasModel.eliminar(Number(req.params.id));
  return ok(res, { mensaje: 'Categoría eliminada' });
}
