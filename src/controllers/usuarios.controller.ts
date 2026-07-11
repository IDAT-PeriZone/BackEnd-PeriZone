import { Response } from 'express';
import bcrypt from 'bcryptjs';
import * as usuariosModel from '../models/usuarios.model';
import * as rolesModel from '../models/roles.model';
import { ok, fail } from '../utils/response';
import { ApiError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { toCsv } from '../utils/csv';

/** Sección "Usuarios" del panel (administrador y marketing, según la matriz de permisos). */
export async function listar(req: AuthRequest, res: Response): Promise<Response | void> {
  const usuarios = await usuariosModel.listarUsuarios();

  if (req.query.formato === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment('usuarios.csv');
    res.send(toCsv(usuarios as unknown as Record<string, unknown>[]));
    return;
  }

  return ok(res, usuarios);
}

export async function obtener(req: AuthRequest, res: Response): Promise<Response> {
  const usuario = await usuariosModel.buscarPorId(Number(req.params.id));
  if (!usuario) return fail(res, 'Usuario no encontrado', 404);
  return ok(res, usuario);
}

/** Crea un usuario interno del panel (administrador, finanzas, almacen o marketing). Solo administrador. */
export async function crearInterno(req: AuthRequest, res: Response): Promise<Response> {
  const { nombre, apellido, correo, contrasenia, telefono, rol } = req.body;
  if (!nombre || !apellido || !correo || !contrasenia || !rol) {
    return fail(res, 'nombre, apellido, correo, contrasenia y rol son obligatorios', 422);
  }

  const existente = await usuariosModel.buscarPorCorreo(correo);
  if (existente) return fail(res, 'Ya existe una cuenta registrada con ese correo', 409);

  const rolEncontrado = await rolesModel.buscarRolPorNombre(rol);
  if (!rolEncontrado) throw new ApiError(`El rol "${rol}" no existe`, 422);

  const hash = await bcrypt.hash(contrasenia, 10);
  const id = await usuariosModel.crearUsuario({
    id_rol: rolEncontrado.id,
    nombre,
    apellido,
    correo,
    contrasenia: hash,
    telefono,
  });

  const usuario = await usuariosModel.buscarPorId(id);
  return ok(res, usuario, 201);
}

export async function actualizar(req: AuthRequest, res: Response): Promise<Response> {
  const { nombre, apellido, telefono, activo } = req.body;
  await usuariosModel.actualizarUsuario(Number(req.params.id), { nombre, apellido, telefono, activo });
  const usuario = await usuariosModel.buscarPorId(Number(req.params.id));
  return ok(res, usuario);
}

/** Desactiva (soft-delete) un usuario en lugar de borrarlo, para no perder el historial de sus órdenes. */
export async function desactivar(req: AuthRequest, res: Response): Promise<Response> {
  await usuariosModel.actualizarUsuario(Number(req.params.id), { activo: 0 });
  return ok(res, { mensaje: 'Usuario desactivado' });
}
