import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { MovimientoInventario, TipoMovimiento } from '../types';

/** Inserta una fila de kardex. Puede recibir la conexión de una transacción en curso (checkout) o usar el pool directo (ajustes manuales). */
export async function registrarMovimiento(
  ejecutor: PoolConnection | typeof pool,
  datos: {
    id_producto: number;
    tipo: TipoMovimiento;
    cantidad: number;
    stock_anterior: number;
    stock_resultante: number;
    motivo: string;
    id_orden?: number | null;
    id_usuario?: number | null;
  }
): Promise<number> {
  const [result] = await ejecutor.query<ResultSetHeader>(
    `INSERT INTO movimientos_inventario
       (id_producto, tipo, cantidad, stock_anterior, stock_resultante, motivo, id_orden, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_producto,
      datos.tipo,
      datos.cantidad,
      datos.stock_anterior,
      datos.stock_resultante,
      datos.motivo,
      datos.id_orden ?? null,
      datos.id_usuario ?? null,
    ]
  );
  return result.insertId;
}

export async function listarPorProducto(idProducto: number): Promise<MovimientoInventario[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM movimientos_inventario WHERE id_producto = ? ORDER BY fecha_creacion DESC',
    [idProducto]
  );
  return rows as MovimientoInventario[];
}

export async function listarTodos(limite = 200): Promise<MovimientoInventario[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM movimientos_inventario ORDER BY fecha_creacion DESC LIMIT ?',
    [limite]
  );
  return rows as MovimientoInventario[];
}
