import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Rol } from '../types';

export async function buscarRolPorNombre(nombre: string): Promise<Rol | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM roles WHERE nombre = ? LIMIT 1', [nombre]);
  return (rows[0] as Rol) ?? null;
}

export async function listarRoles(): Promise<Rol[]> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM roles ORDER BY id');
  return rows as Rol[];
}

export async function buscarRolPorId(id: number): Promise<Rol | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM roles WHERE id = ? LIMIT 1', [id]);
  return (rows[0] as Rol) ?? null;
}
