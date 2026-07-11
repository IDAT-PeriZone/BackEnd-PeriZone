import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { DetalleOrden, EstadoOrden, HistorialEstadoOrden, MetodoPago, Orden } from '../types';

export async function crearOrden(
  conn: PoolConnection,
  datos: {
    id_usuario: number;
    id_direccion: number | null;
    direccion_entrega: string;
    subtotal: number;
    igv: number;
    total: number;
    metodo_pago: MetodoPago;
  }
): Promise<number> {
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO ordenes (id_usuario, id_direccion, direccion_entrega, subtotal, igv, total, metodo_pago)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_usuario,
      datos.id_direccion,
      datos.direccion_entrega,
      datos.subtotal,
      datos.igv,
      datos.total,
      datos.metodo_pago,
    ]
  );
  return result.insertId;
}

export async function agregarDetalle(
  conn: PoolConnection,
  datos: { id_orden: number; id_producto: number; cantidad: number; precio_unitario: number; subtotal: number }
): Promise<void> {
  await conn.query(
    `INSERT INTO detalle_ordenes (id_orden, id_producto, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.id_orden, datos.id_producto, datos.cantidad, datos.precio_unitario, datos.subtotal]
  );
}

export async function buscarPorId(id: number): Promise<Orden | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ordenes WHERE id = ? LIMIT 1', [id]);
  return (rows[0] as Orden) ?? null;
}

export async function listarDetalle(idOrden: number): Promise<(DetalleOrden & { nombre: string })[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.*, p.nombre
     FROM detalle_ordenes d
     JOIN productos p ON p.id = d.id_producto
     WHERE d.id_orden = ?`,
    [idOrden]
  );
  return rows as (DetalleOrden & { nombre: string })[];
}

export async function listarPorUsuario(idUsuario: number): Promise<Orden[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM ordenes WHERE id_usuario = ? ORDER BY fecha_creacion DESC',
    [idUsuario]
  );
  return rows as Orden[];
}

export async function listarTodas(estado?: EstadoOrden): Promise<Orden[]> {
  if (estado) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM ordenes WHERE estado = ? ORDER BY fecha_creacion DESC',
      [estado]
    );
    return rows as Orden[];
  }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ordenes ORDER BY fecha_creacion DESC');
  return rows as Orden[];
}

export async function cambiarEstado(
  ejecutor: PoolConnection | typeof pool,
  idOrden: number,
  nuevoEstado: EstadoOrden
): Promise<void> {
  await ejecutor.query('UPDATE ordenes SET estado = ? WHERE id = ?', [nuevoEstado, idOrden]);
}

export async function registrarCambioEstado(
  ejecutor: PoolConnection | typeof pool,
  datos: { id_orden: number; estado_anterior: EstadoOrden | null; estado_nuevo: EstadoOrden; id_usuario: number | null }
): Promise<void> {
  await ejecutor.query(
    `INSERT INTO historial_estados_orden (id_orden, estado_anterior, estado_nuevo, id_usuario)
     VALUES (?, ?, ?, ?)`,
    [datos.id_orden, datos.estado_anterior, datos.estado_nuevo, datos.id_usuario]
  );
}

export async function listarHistorialEstados(idOrden: number): Promise<HistorialEstadoOrden[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM historial_estados_orden WHERE id_orden = ? ORDER BY fecha_creacion ASC',
    [idOrden]
  );
  return rows as HistorialEstadoOrden[];
}
