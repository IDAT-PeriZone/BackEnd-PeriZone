import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Categoria } from '../types';

export async function listar(): Promise<Categoria[]> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categorias ORDER BY nombre');
  return rows as Categoria[];
}

export async function buscarPorId(id: number): Promise<Categoria | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categorias WHERE id = ? LIMIT 1', [id]);
  return (rows[0] as Categoria) ?? null;
}

export async function crear(nombre: string, descripcion?: string | null): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion ?? null]
  );
  return result.insertId;
}

export async function actualizar(id: number, nombre?: string, descripcion?: string | null): Promise<void> {
  await pool.query('UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = ? WHERE id = ?', [
    nombre ?? null,
    descripcion ?? null,
    id,
  ]);
}

export async function eliminar(id: number): Promise<void> {
  await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
}
