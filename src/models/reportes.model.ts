import { RowDataPacket } from 'mysql2';
import pool from '../config/db';

export interface ResumenDashboard {
  ordenes_hoy: number;
  ingresos_hoy: number;
  productos_stock_bajo: number;
}

export async function obtenerResumenDashboard(): Promise<ResumenDashboard> {
  const [ordenesRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS ingresos
     FROM ordenes
     WHERE DATE(fecha_creacion) = CURDATE() AND estado != 'cancelado'`
  );
  const [stockRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM productos WHERE activo = 1 AND stock <= stock_minimo'
  );

  return {
    ordenes_hoy: Number(ordenesRows[0].total),
    ingresos_hoy: Number(ordenesRows[0].ingresos),
    productos_stock_bajo: Number(stockRows[0].total),
  };
}

export interface VentaPorDia {
  fecha: string;
  cantidad_ordenes: number;
  total_vendido: number;
}

export async function ventasPorPeriodo(desde: string, hasta: string): Promise<VentaPorDia[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(fecha_creacion) AS fecha, COUNT(*) AS cantidad_ordenes, SUM(total) AS total_vendido
     FROM ordenes
     WHERE DATE(fecha_creacion) BETWEEN ? AND ? AND estado != 'cancelado'
     GROUP BY DATE(fecha_creacion)
     ORDER BY fecha`,
    [desde, hasta]
  );
  return rows as VentaPorDia[];
}

export interface ProductoMasVendido {
  id_producto: number;
  nombre: string;
  unidades_vendidas: number;
  total_generado: number;
}

export async function productosMasVendidos(limite = 10): Promise<ProductoMasVendido[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.id_producto, p.nombre, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS total_generado
     FROM detalle_ordenes d
     JOIN productos p ON p.id = d.id_producto
     JOIN ordenes o ON o.id = d.id_orden
     WHERE o.estado != 'cancelado'
     GROUP BY d.id_producto, p.nombre
     ORDER BY unidades_vendidas DESC
     LIMIT ?`,
    [limite]
  );
  return rows as ProductoMasVendido[];
}
