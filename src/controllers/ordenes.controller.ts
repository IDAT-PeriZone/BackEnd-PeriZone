import { Response } from 'express';
import pool from '../config/db';
import * as carritoModel from '../models/carrito.model';
import * as direccionesModel from '../models/direcciones.model';
import * as ordenesModel from '../models/ordenes.model';
import * as productosModel from '../models/productos.model';
import * as pagosModel from '../models/pagos.model';
import * as comprobantesModel from '../models/comprobantes.model';
import * as inventarioModel from '../models/inventario.model';
import { ok, fail } from '../utils/response';
import { ApiError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { calcularTotales } from '../utils/dinero';
import { EstadoOrden } from '../types';

const ROLES_ADMIN_ORDENES = ['administrador', 'finanzas', 'almacen'] as const;

/** Transiciones de estado permitidas para la sección "Órdenes" del panel admin. */
const TRANSICIONES_VALIDAS: Record<EstadoOrden, EstadoOrden[]> = {
  pendiente: ['procesando', 'cancelado'],
  procesando: ['enviado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

/**
 * RF06/RF07: checkout de una sola operación. Valida el carrito y el
 * stock, SIMULA el pago contra el catálogo de tarjetas de prueba
 * (database/seed.sql) y, solo si el pago resulta aprobado, persiste
 * la orden, descuenta stock (con su movimiento de kardex), genera el
 * comprobante y vacía el carrito. Si el pago es rechazado no se
 * escribe nada en la base de datos: el cliente puede reintentar.
 */
export async function checkout(req: AuthRequest, res: Response): Promise<Response> {
  const idUsuario = req.usuario!.id;
  const { id_direccion, metodo_pago, numero_tarjeta, cvv, fecha_expiracion, ruc_razon_social } = req.body;

  if (!id_direccion || !metodo_pago) {
    return fail(res, 'id_direccion y metodo_pago son obligatorios', 422);
  }
  if (!['tarjeta', 'yape', 'transferencia'].includes(metodo_pago)) {
    return fail(res, 'metodo_pago inválido', 422);
  }

  const direccion = await direccionesModel.buscarPorId(id_direccion);
  if (!direccion || direccion.id_usuario !== idUsuario) {
    return fail(res, 'Dirección no encontrada', 404);
  }

  const carrito = await carritoModel.obtenerOCrearCarrito(idUsuario);
  const items = await carritoModel.listarItems(carrito.id);
  if (items.length === 0) {
    return fail(res, 'El carrito está vacío', 400);
  }

  for (const item of items) {
    if (item.stock < item.cantidad) {
      return fail(res, `Stock insuficiente para "${item.nombre}". Disponible: ${item.stock}`, 409);
    }
  }

  const totales = calcularTotales(carritoModel.calcularSubtotal(items));

  // --- Simulación de la pasarela de pagos (sin llamar a ningún servicio externo) ---
  let pagoAprobado: boolean;
  let referenciaPasarela: string;
  let ultimosDigitos: string | null = null;

  if (metodo_pago === 'tarjeta') {
    if (!numero_tarjeta || !cvv || !fecha_expiracion) {
      return fail(res, 'numero_tarjeta, cvv y fecha_expiracion son obligatorios para pagar con tarjeta', 422);
    }
    const tarjeta = await pagosModel.buscarTarjetaPrueba(numero_tarjeta);
    pagoAprobado = tarjeta?.resultado_simulado === 'aprobado';
    ultimosDigitos = String(numero_tarjeta).slice(-4);
    referenciaPasarela = tarjeta ? `SIM-${Date.now()}` : 'SIM-TARJETA-NO-RECONOCIDA';
  } else {
    // Yape y transferencia se simulan como confirmación instantánea aprobada.
    // Para probar el flujo de rechazo en Postman, envía "simular_rechazo": true.
    pagoAprobado = req.body.simular_rechazo !== true;
    referenciaPasarela = `SIM-${metodo_pago.toUpperCase()}-${Date.now()}`;
  }

  if (!pagoAprobado) {
    return fail(res, 'El pago fue rechazado por la pasarela simulada. Intenta con otro método o tarjeta.', 402);
  }

  const direccionTexto = `${direccion.direccion}, ${direccion.distrito}, ${direccion.provincia}${
    direccion.referencia ? ` (Ref: ${direccion.referencia})` : ''
  }`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const idOrden = await ordenesModel.crearOrden(conn, {
      id_usuario: idUsuario,
      id_direccion,
      direccion_entrega: direccionTexto,
      subtotal: totales.subtotal,
      igv: totales.igv,
      total: totales.total,
      metodo_pago,
    });

    await ordenesModel.registrarCambioEstado(conn, {
      id_orden: idOrden,
      estado_anterior: null,
      estado_nuevo: 'pendiente',
      id_usuario: null,
    });

    for (const item of items) {
      await ordenesModel.agregarDetalle(conn, {
        id_orden: idOrden,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: redondearItem(item.precio, item.cantidad),
      });

      const descontado = await productosModel.descontarStock(conn, item.id_producto, item.cantidad);
      if (!descontado) {
        throw new ApiError(`Stock insuficiente para "${item.nombre}" al momento de confirmar el pago`, 409);
      }

      await inventarioModel.registrarMovimiento(conn, {
        id_producto: item.id_producto,
        tipo: 'salida',
        cantidad: item.cantidad,
        stock_anterior: item.stock,
        stock_resultante: item.stock - item.cantidad,
        motivo: 'venta',
        id_orden: idOrden,
        id_usuario: null,
      });
    }

    await pagosModel.registrarPago(conn, {
      id_orden: idOrden,
      metodo_pago,
      monto: totales.total,
      estado: 'aprobado',
      referencia_pasarela: referenciaPasarela,
      ultimos_digitos_tarjeta: ultimosDigitos,
    });

    await ordenesModel.cambiarEstado(conn, idOrden, 'procesando');
    await ordenesModel.registrarCambioEstado(conn, {
      id_orden: idOrden,
      estado_anterior: 'pendiente',
      estado_nuevo: 'procesando',
      id_usuario: null,
    });

    const tipoComprobante = ruc_razon_social ? 'factura' : 'boleta';
    const numeroComprobante = await comprobantesModel.generarNumero(conn, tipoComprobante);
    await comprobantesModel.crear(conn, {
      id_orden: idOrden,
      tipo: tipoComprobante,
      numero: numeroComprobante,
      ruc_razon_social,
      monto_total: totales.total,
      igv: totales.igv,
    });

    await carritoModel.vaciarCarrito(conn, carrito.id);

    await conn.commit();

    return ok(res, { id_orden: idOrden, ...totales, comprobante: numeroComprobante }, 201);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function redondearItem(precioUnitario: number, cantidad: number): number {
  return Number((precioUnitario * cantidad).toFixed(2));
}

async function construirDetalleCompleto(idOrden: number) {
  const [orden, detalle, historial, pagos, comprobante] = await Promise.all([
    ordenesModel.buscarPorId(idOrden),
    ordenesModel.listarDetalle(idOrden),
    ordenesModel.listarHistorialEstados(idOrden),
    pagosModel.listarPorOrden(idOrden),
    comprobantesModel.buscarPorOrden(idOrden),
  ]);
  return { orden, detalle, historial, pagos, comprobante };
}

/** RF08: historial de compras del cliente autenticado. */
export async function misOrdenes(req: AuthRequest, res: Response): Promise<Response> {
  const ordenes = await ordenesModel.listarPorUsuario(req.usuario!.id);
  return ok(res, ordenes);
}

/** Sección "Órdenes" del panel admin (administrador, finanzas, almacen). */
export async function listarTodas(req: AuthRequest, res: Response): Promise<Response> {
  const estado = req.query.estado as EstadoOrden | undefined;
  const ordenes = await ordenesModel.listarTodas(estado);
  return ok(res, ordenes);
}

/** RF08: detalle + seguimiento de una orden. El cliente solo puede ver las suyas. */
export async function obtener(req: AuthRequest, res: Response): Promise<Response> {
  const idOrden = Number(req.params.id);
  const { orden, detalle, historial, pagos, comprobante } = await construirDetalleCompleto(idOrden);
  if (!orden) return fail(res, 'Orden no encontrada', 404);

  const esDueno = orden.id_usuario === req.usuario!.id;
  const esAdmin = ROLES_ADMIN_ORDENES.includes(req.usuario!.rol as (typeof ROLES_ADMIN_ORDENES)[number]);
  if (!esDueno && !esAdmin) return fail(res, 'No tienes acceso a esta orden', 403);

  return ok(res, { orden, detalle, historial, pagos, comprobante });
}

/** Cambia el estado de una orden (administrador/almacén) y registra el movimiento en el historial. Si se cancela, repone el stock reservado. */
export async function cambiarEstado(req: AuthRequest, res: Response): Promise<Response> {
  const idOrden = Number(req.params.id);
  const { estado: nuevoEstado } = req.body as { estado: EstadoOrden };

  const orden = await ordenesModel.buscarPorId(idOrden);
  if (!orden) return fail(res, 'Orden no encontrada', 404);

  const permitidos = TRANSICIONES_VALIDAS[orden.estado];
  if (!permitidos.includes(nuevoEstado)) {
    return fail(
      res,
      `No se puede pasar de "${orden.estado}" a "${nuevoEstado}". Transiciones válidas: ${
        permitidos.join(', ') || 'ninguna (estado final)'
      }`,
      409
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await ordenesModel.cambiarEstado(conn, idOrden, nuevoEstado);
    await ordenesModel.registrarCambioEstado(conn, {
      id_orden: idOrden,
      estado_anterior: orden.estado,
      estado_nuevo: nuevoEstado,
      id_usuario: req.usuario!.id,
    });

    if (nuevoEstado === 'cancelado') {
      const detalle = await ordenesModel.listarDetalle(idOrden);
      for (const item of detalle) {
        const producto = await productosModel.buscarPorId(item.id_producto);
        const stockAnterior = producto ? producto.stock : 0;
        await productosModel.incrementarStock(conn, item.id_producto, item.cantidad);
        await inventarioModel.registrarMovimiento(conn, {
          id_producto: item.id_producto,
          tipo: 'entrada',
          cantidad: item.cantidad,
          stock_anterior: stockAnterior,
          stock_resultante: stockAnterior + item.cantidad,
          motivo: 'cancelacion',
          id_orden: idOrden,
          id_usuario: req.usuario!.id,
        });
      }
    }

    await conn.commit();
    return ok(res, { mensaje: `Orden actualizada a "${nuevoEstado}"` });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
