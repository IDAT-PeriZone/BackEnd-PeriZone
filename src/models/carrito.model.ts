import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { Carrito, CarritoDetalle } from '../types';

export interface ItemCarrito extends CarritoDetalle {
  nombre: string;
  precio: number;
  stock: number;
  imagen_url: string | null;
}

/** Devuelve el carrito del usuario, creándolo si todavía no existe (un carrito activo por usuario). */
export async function obtenerOCrearCarrito(idUsuario: number): Promise<Carrito> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM carrito WHERE id_usuario = ? LIMIT 1', [
    idUsuario,
  ]);
  if (rows[0]) return rows[0] as Carrito;

  const [result] = await pool.query<ResultSetHeader>('INSERT INTO carrito (id_usuario) VALUES (?)', [idUsuario]);
  return { id: result.insertId, id_usuario: idUsuario, fecha_creacion: new Date(), fecha_actualizacion: new Date() };
}

export async function listarItems(idCarrito: number): Promise<ItemCarrito[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT cd.*, p.nombre, p.precio, p.stock, p.imagen_url
     FROM carrito_detalle cd
     JOIN productos p ON p.id = cd.id_producto
     WHERE cd.id_carrito = ?
     ORDER BY cd.fecha_agregado DESC`,
    [idCarrito]
  );
  return rows as ItemCarrito[];
}

/** Agrega un producto o, si ya estaba en el carrito, suma la cantidad indicada. */
export async function agregarItem(idCarrito: number, idProducto: number, cantidad: number): Promise<void> {
  await pool.query(
    `INSERT INTO carrito_detalle (id_carrito, id_producto, cantidad)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
    [idCarrito, idProducto, cantidad]
  );
  await pool.query('UPDATE carrito SET fecha_actualizacion = NOW() WHERE id = ?', [idCarrito]);
}

export async function actualizarCantidad(idCarrito: number, idProducto: number, cantidad: number): Promise<void> {
  await pool.query('UPDATE carrito_detalle SET cantidad = ? WHERE id_carrito = ? AND id_producto = ?', [
    cantidad,
    idCarrito,
    idProducto,
  ]);
}

export async function quitarItem(idCarrito: number, idProducto: number): Promise<void> {
  await pool.query('DELETE FROM carrito_detalle WHERE id_carrito = ? AND id_producto = ?', [
    idCarrito,
    idProducto,
  ]);
}

export async function vaciarCarrito(ejecutor: PoolConnection | typeof pool, idCarrito: number): Promise<void> {
  await ejecutor.query('DELETE FROM carrito_detalle WHERE id_carrito = ?', [idCarrito]);
}

export function calcularSubtotal(items: ItemCarrito[]): number {
  return items.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0);
}
