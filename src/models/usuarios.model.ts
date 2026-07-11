import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Usuario, UsuarioPublico } from '../types';

const CAMPOS_PUBLICOS =
  'id, id_rol, nombre, apellido, correo, telefono, activo, fecha_creacion';

export async function crearUsuario(datos: {
  id_rol: number;
  nombre: string;
  apellido: string;
  correo: string;
  contrasenia: string;
  telefono?: string | null;
}): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO usuarios (id_rol, nombre, apellido, correo, contrasenia, telefono)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.id_rol, datos.nombre, datos.apellido, datos.correo, datos.contrasenia, datos.telefono ?? null]
  );
  return result.insertId;
}

export async function buscarPorCorreo(correo: string): Promise<Usuario | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM usuarios WHERE correo = ? LIMIT 1', [correo]);
  return (rows[0] as Usuario) ?? null;
}

export async function buscarPorId(id: number): Promise<UsuarioPublico | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ? LIMIT 1`,
    [id]
  );
  return (rows[0] as UsuarioPublico) ?? null;
}

export async function listarUsuarios(idRol?: number): Promise<UsuarioPublico[]> {
  if (idRol) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id_rol = ? ORDER BY fecha_creacion DESC`,
      [idRol]
    );
    return rows as UsuarioPublico[];
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY fecha_creacion DESC`
  );
  return rows as UsuarioPublico[];
}

export async function actualizarUsuario(
  id: number,
  datos: Partial<Pick<Usuario, 'nombre' | 'apellido' | 'telefono' | 'activo'>>
): Promise<void> {
  const campos = Object.keys(datos);
  if (campos.length === 0) return;

  const set = campos.map((campo) => `${campo} = ?`).join(', ');
  const valores = campos.map((campo) => (datos as Record<string, unknown>)[campo]);

  await pool.query(`UPDATE usuarios SET ${set} WHERE id = ?`, [...valores, id]);
}

export async function guardarTokenRecuperacion(id: number, token: string, expira: Date): Promise<void> {
  await pool.query('UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE id = ?', [
    token,
    expira,
    id,
  ]);
}

export async function buscarPorTokenRecuperacion(token: string): Promise<Usuario | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expira > NOW() LIMIT 1',
    [token]
  );
  return (rows[0] as Usuario) ?? null;
}

export async function actualizarContraseniaYLimpiarToken(id: number, contraseniaHash: string): Promise<void> {
  await pool.query(
    'UPDATE usuarios SET contrasenia = ?, reset_token = NULL, reset_token_expira = NULL WHERE id = ?',
    [contraseniaHash, id]
  );
}
