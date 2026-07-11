import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { Producto, ProductoImagen } from '../types';

export interface FiltrosProducto {
  categoria?: number;
  precioMin?: number;
  precioMax?: number;
  buscar?: string;
  soloActivos?: boolean;
}

/** RF03/RF04: catálogo con búsqueda y filtros por categoría y rango de precio. */
export async function listar(filtros: FiltrosProducto = {}): Promise<Producto[]> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.soloActivos) {
    condiciones.push('activo = 1');
  }
  if (filtros.categoria) {
    condiciones.push('id_categoria = ?');
    valores.push(filtros.categoria);
  }
  if (filtros.precioMin !== undefined) {
    condiciones.push('precio >= ?');
    valores.push(filtros.precioMin);
  }
  if (filtros.precioMax !== undefined) {
    condiciones.push('precio <= ?');
    valores.push(filtros.precioMax);
  }
  if (filtros.buscar) {
    condiciones.push('nombre LIKE ?');
    valores.push(`%${filtros.buscar}%`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM productos ${where} ORDER BY fecha_creacion DESC`,
    valores
  );
  return rows as Producto[];
}

export async function buscarPorId(id: number): Promise<Producto | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM productos WHERE id = ? LIMIT 1', [id]);
  return (rows[0] as Producto) ?? null;
}

export async function listarImagenes(idProducto: number): Promise<ProductoImagen[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM producto_imagenes WHERE id_producto = ? ORDER BY orden',
    [idProducto]
  );
  return rows as ProductoImagen[];
}

export async function crear(datos: {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  stock: number;
  stock_minimo?: number;
  imagen_url?: string | null;
}): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO productos (id_categoria, nombre, descripcion, precio, stock, stock_minimo, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_categoria,
      datos.nombre,
      datos.descripcion ?? null,
      datos.precio,
      datos.stock,
      datos.stock_minimo ?? 5,
      datos.imagen_url ?? null,
    ]
  );
  return result.insertId;
}

export async function actualizar(id: number, datos: Partial<Producto>): Promise<void> {
  const permitidos = ['id_categoria', 'nombre', 'descripcion', 'precio', 'stock_minimo', 'imagen_url', 'activo'];
  const campos = Object.keys(datos).filter((c) => permitidos.includes(c));
  if (campos.length === 0) return;

  const set = campos.map((campo) => `${campo} = ?`).join(', ');
  const valores = campos.map((campo) => (datos as Record<string, unknown>)[campo]);

  await pool.query(`UPDATE productos SET ${set} WHERE id = ?`, [...valores, id]);
}

export async function eliminar(id: number): Promise<void> {
  await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
}

export async function agregarImagen(idProducto: number, imagenUrl: string, orden = 0): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO producto_imagenes (id_producto, imagen_url, orden) VALUES (?, ?, ?)',
    [idProducto, imagenUrl, orden]
  );
  return result.insertId;
}

export async function listarStockCritico(): Promise<Producto[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY stock ASC'
  );
  return rows as Producto[];
}

/**
 * Descuenta stock de forma atómica dentro de una transacción existente.
 * La condición `stock >= cantidad` en el WHERE evita sobreventas por
 * condiciones de carrera; si affectedRows es 0, no había stock suficiente.
 */
export async function descontarStock(
  ejecutor: PoolConnection | typeof pool,
  idProducto: number,
  cantidad: number
): Promise<boolean> {
  const [result] = await ejecutor.query<ResultSetHeader>(
    'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [cantidad, idProducto, cantidad]
  );
  return result.affectedRows > 0;
}

export async function incrementarStock(
  ejecutor: PoolConnection | typeof pool,
  idProducto: number,
  cantidad: number
): Promise<void> {
  await ejecutor.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, idProducto]);
}
