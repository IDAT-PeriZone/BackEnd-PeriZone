import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { Comprobante, TipoComprobante } from '../types';

/** Genera un correlativo simple tipo B001-00000001 / F001-00000001 según el conteo actual de comprobantes del mismo tipo. */
export async function generarNumero(conn: PoolConnection, tipo: TipoComprobante): Promise<string> {
  const prefijo = tipo === 'boleta' ? 'B001' : 'F001';
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM comprobantes WHERE tipo = ?',
    [tipo]
  );
  const total = (rows[0] as { total: number }).total;
  const correlativo = String(total + 1).padStart(8, '0');
  return `${prefijo}-${correlativo}`;
}

export async function crear(
  conn: PoolConnection,
  datos: {
    id_orden: number;
    tipo: TipoComprobante;
    numero: string;
    ruc_razon_social?: string | null;
    monto_total: number;
    igv: number;
  }
): Promise<number> {
  const [result] = await conn.query(
    `INSERT INTO comprobantes (id_orden, tipo, numero, ruc_razon_social, monto_total, igv)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.id_orden, datos.tipo, datos.numero, datos.ruc_razon_social ?? null, datos.monto_total, datos.igv]
  );
  return (result as { insertId: number }).insertId;
}

export async function buscarPorOrden(idOrden: number): Promise<Comprobante | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM comprobantes WHERE id_orden = ? LIMIT 1', [
    idOrden,
  ]);
  return (rows[0] as Comprobante) ?? null;
}
