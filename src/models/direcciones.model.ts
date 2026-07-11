import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Direccion } from '../types';

export async function listarPorUsuario(idUsuario: number): Promise<Direccion[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM direcciones WHERE id_usuario = ? ORDER BY predeterminada DESC, fecha_creacion DESC',
    [idUsuario]
  );
  return rows as Direccion[];
}

export async function buscarPorId(id: number): Promise<Direccion | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM direcciones WHERE id = ? LIMIT 1', [id]);
  return (rows[0] as Direccion) ?? null;
}

export async function crear(datos: {
  id_usuario: number;
  direccion: string;
  distrito: string;
  provincia?: string;
  departamento?: string;
  referencia?: string | null;
  predeterminada?: boolean;
}): Promise<number> {
  if (datos.predeterminada) {
    await pool.query('UPDATE direcciones SET predeterminada = 0 WHERE id_usuario = ?', [datos.id_usuario]);
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO direcciones (id_usuario, direccion, distrito, provincia, departamento, referencia, predeterminada)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_usuario,
      datos.direccion,
      datos.distrito,
      datos.provincia ?? 'Lima',
      datos.departamento ?? 'Lima',
      datos.referencia ?? null,
      datos.predeterminada ? 1 : 0,
    ]
  );
  return result.insertId;
}

export async function actualizar(
  id: number,
  idUsuario: number,
  datos: Partial<{
    direccion: string;
    distrito: string;
    provincia: string;
    departamento: string;
    referencia: string | null;
    predeterminada: boolean;
  }>
): Promise<void> {
  if (datos.predeterminada) {
    await pool.query('UPDATE direcciones SET predeterminada = 0 WHERE id_usuario = ?', [idUsuario]);
  }

  const campos = Object.keys(datos);
  if (campos.length === 0) return;

  const set = campos.map((campo) => `${campo} = ?`).join(', ');
  const valores = campos.map((campo) => {
    const valor = (datos as Record<string, unknown>)[campo];
    return campo === 'predeterminada' ? (valor ? 1 : 0) : valor;
  });

  await pool.query(`UPDATE direcciones SET ${set} WHERE id = ? AND id_usuario = ?`, [...valores, id, idUsuario]);
}

export async function eliminar(id: number, idUsuario: number): Promise<void> {
  await pool.query('DELETE FROM direcciones WHERE id = ? AND id_usuario = ?', [id, idUsuario]);
}
