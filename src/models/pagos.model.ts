import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { EstadoPago, MetodoPago, Pago, TarjetaPrueba } from '../types';

/**
 * Busca una tarjeta en el catálogo ficticio (database/seed.sql) para
 * simular la respuesta de la pasarela de pagos. Si el número no está
 * registrado, se trata como tarjeta no reconocida (rechazada), igual
 * que rechazaría un gateway real ante una tarjeta desconocida.
 */
export async function buscarTarjetaPrueba(numeroTarjeta: string): Promise<TarjetaPrueba | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM tarjetas_prueba WHERE numero_tarjeta = ? LIMIT 1',
    [numeroTarjeta]
  );
  return (rows[0] as TarjetaPrueba) ?? null;
}

export async function registrarPago(
  conn: PoolConnection,
  datos: {
    id_orden: number;
    metodo_pago: MetodoPago;
    monto: number;
    estado: EstadoPago;
    referencia_pasarela: string | null;
    ultimos_digitos_tarjeta: string | null;
  }
): Promise<number> {
  const fechaPago = datos.estado === 'aprobado' ? new Date() : null;
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO pagos (id_orden, metodo_pago, monto, estado, referencia_pasarela, ultimos_digitos_tarjeta, fecha_pago)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_orden,
      datos.metodo_pago,
      datos.monto,
      datos.estado,
      datos.referencia_pasarela,
      datos.ultimos_digitos_tarjeta,
      fechaPago,
    ]
  );
  return result.insertId;
}

export async function listarPorOrden(idOrden: number): Promise<Pago[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM pagos WHERE id_orden = ? ORDER BY fecha_creacion DESC',
    [idOrden]
  );
  return rows as Pago[];
}
