import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as usuariosModel from '../models/usuarios.model';
import * as rolesModel from '../models/roles.model';
import { generarToken } from '../utils/jwt';
import { ok, fail } from '../utils/response';
import { ApiError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { RolNombre } from '../types';

const SALT_ROUNDS = 10;

/** RF01: registro de clientes. Los usuarios internos (admin/finanzas/almacen/marketing) los crea un administrador vía /api/usuarios. */
export async function registrar(req: Request, res: Response): Promise<Response> {
  const { nombre, apellido, correo, contrasenia, telefono } = req.body;

  if (!nombre || !apellido || !correo || !contrasenia) {
    return fail(res, 'nombre, apellido, correo y contrasenia son obligatorios', 422);
  }

  const existente = await usuariosModel.buscarPorCorreo(correo);
  if (existente) {
    return fail(res, 'Ya existe una cuenta registrada con ese correo', 409);
  }

  const rolCliente = await rolesModel.buscarRolPorNombre('cliente');
  if (!rolCliente) {
    throw new ApiError('El rol "cliente" no está configurado en la base de datos', 500);
  }

  const hash = await bcrypt.hash(contrasenia, SALT_ROUNDS);
  const idUsuario = await usuariosModel.crearUsuario({
    id_rol: rolCliente.id,
    nombre,
    apellido,
    correo,
    contrasenia: hash,
    telefono,
  });

  const token = generarToken({ id: idUsuario, correo, rol: 'cliente' });
  const usuario = await usuariosModel.buscarPorId(idUsuario);
  return ok(res, { usuario, token }, 201);
}

/** RF02: inicio de sesión para clientes y usuarios internos del panel. */
export async function login(req: Request, res: Response): Promise<Response> {
  const { correo, contrasenia } = req.body;
  if (!correo || !contrasenia) {
    return fail(res, 'correo y contrasenia son obligatorios', 422);
  }

  const usuario = await usuariosModel.buscarPorCorreo(correo);
  if (!usuario || !usuario.activo) {
    return fail(res, 'Credenciales inválidas', 401);
  }

  const coincide = await bcrypt.compare(contrasenia, usuario.contrasenia);
  if (!coincide) {
    return fail(res, 'Credenciales inválidas', 401);
  }

  const rol = await rolesModel.buscarRolPorId(usuario.id_rol);
  if (!rol) {
    throw new ApiError('El rol del usuario no existe', 500);
  }

  const token = generarToken({ id: usuario.id, correo: usuario.correo, rol: rol.nombre as RolNombre });
  const usuarioPublico = await usuariosModel.buscarPorId(usuario.id);
  return ok(res, { usuario: usuarioPublico, token });
}

export async function perfil(req: AuthRequest, res: Response): Promise<Response> {
  const usuario = await usuariosModel.buscarPorId(req.usuario!.id);
  if (!usuario) return fail(res, 'Usuario no encontrado', 404);
  return ok(res, usuario);
}

/**
 * Recuperación de contraseña simplificada para el entorno académico:
 * como no hay envío real de correos (SMTP), el token se devuelve
 * directamente en la respuesta para poder probarlo desde Postman.
 * En producción este token se enviaría por correo, nunca en la API.
 */
export async function solicitarRecuperacion(req: Request, res: Response): Promise<Response> {
  const { correo } = req.body;
  if (!correo) return fail(res, 'correo es obligatorio', 422);

  const usuario = await usuariosModel.buscarPorCorreo(correo);
  if (!usuario) {
    // No revelamos si el correo existe o no, por seguridad.
    return ok(res, { mensaje: 'Si el correo existe, se generó un token de recuperación' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await usuariosModel.guardarTokenRecuperacion(usuario.id, token, expira);

  return ok(res, { mensaje: 'Token de recuperación generado', token, expira });
}

export async function restablecerContrasenia(req: Request, res: Response): Promise<Response> {
  const { token, nueva_contrasenia } = req.body;
  if (!token || !nueva_contrasenia) {
    return fail(res, 'token y nueva_contrasenia son obligatorios', 422);
  }

  const usuario = await usuariosModel.buscarPorTokenRecuperacion(token);
  if (!usuario) {
    return fail(res, 'Token inválido o expirado', 400);
  }

  const hash = await bcrypt.hash(nueva_contrasenia, SALT_ROUNDS);
  await usuariosModel.actualizarContraseniaYLimpiarToken(usuario.id, hash);

  return ok(res, { mensaje: 'Contraseña actualizada correctamente' });
}
