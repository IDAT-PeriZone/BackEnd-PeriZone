import { Response } from 'express';
import * as carritoModel from '../models/carrito.model';
import * as productosModel from '../models/productos.model';
import pool from '../config/db';
import { ok, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth';
import { calcularTotales } from '../utils/dinero';

async function construirResumen(idCarrito: number) {
  const items = await carritoModel.listarItems(idCarrito);
  const totales = calcularTotales(carritoModel.calcularSubtotal(items));
  return { items, ...totales };
}

/** RF05: ver el carrito con subtotal e IGV antes de proceder al pago. */
export async function ver(req: AuthRequest, res: Response): Promise<Response> {
  const carrito = await carritoModel.obtenerOCrearCarrito(req.usuario!.id);
  const resumen = await construirResumen(carrito.id);
  return ok(res, { id_carrito: carrito.id, ...resumen });
}

export async function agregarItem(req: AuthRequest, res: Response): Promise<Response> {
  const { id_producto, cantidad } = req.body;
  if (!id_producto || !cantidad || cantidad <= 0) {
    return fail(res, 'id_producto y cantidad (> 0) son obligatorios', 422);
  }

  const producto = await productosModel.buscarPorId(id_producto);
  if (!producto || !producto.activo) return fail(res, 'Producto no encontrado', 404);

  const carrito = await carritoModel.obtenerOCrearCarrito(req.usuario!.id);
  const items = await carritoModel.listarItems(carrito.id);
  const yaEnCarrito = items.find((i) => i.id_producto === id_producto)?.cantidad ?? 0;

  if (producto.stock < yaEnCarrito + cantidad) {
    return fail(res, `Stock insuficiente. Disponible: ${producto.stock}`, 409);
  }

  await carritoModel.agregarItem(carrito.id, id_producto, cantidad);
  const resumen = await construirResumen(carrito.id);
  return ok(res, resumen, 201);
}

export async function actualizarItem(req: AuthRequest, res: Response): Promise<Response> {
  const idProducto = Number(req.params.idProducto);
  const { cantidad } = req.body;
  if (!cantidad || cantidad <= 0) return fail(res, 'cantidad (> 0) es obligatoria', 422);

  const producto = await productosModel.buscarPorId(idProducto);
  if (!producto) return fail(res, 'Producto no encontrado', 404);
  if (producto.stock < cantidad) {
    return fail(res, `Stock insuficiente. Disponible: ${producto.stock}`, 409);
  }

  const carrito = await carritoModel.obtenerOCrearCarrito(req.usuario!.id);
  await carritoModel.actualizarCantidad(carrito.id, idProducto, cantidad);
  const resumen = await construirResumen(carrito.id);
  return ok(res, resumen);
}

export async function quitarItem(req: AuthRequest, res: Response): Promise<Response> {
  const carrito = await carritoModel.obtenerOCrearCarrito(req.usuario!.id);
  await carritoModel.quitarItem(carrito.id, Number(req.params.idProducto));
  const resumen = await construirResumen(carrito.id);
  return ok(res, resumen);
}

export async function vaciar(req: AuthRequest, res: Response): Promise<Response> {
  const carrito = await carritoModel.obtenerOCrearCarrito(req.usuario!.id);
  await carritoModel.vaciarCarrito(pool, carrito.id);
  return ok(res, { mensaje: 'Carrito vaciado' });
}
