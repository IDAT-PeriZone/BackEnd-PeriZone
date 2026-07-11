import { Response } from 'express';
import pool from '../config/db';
import * as inventarioModel from '../models/inventario.model';
import * as productosModel from '../models/productos.model';
import { ok, fail } from '../utils/response';
import { AuthRequest } from '../middlewares/auth';
import { toCsv } from '../utils/csv';

/** Kardex: bitácora de entradas/salidas de un producto o de todo el catálogo. */
export async function listar(req: AuthRequest, res: Response): Promise<Response | void> {
  const idProducto = req.query.id_producto ? Number(req.query.id_producto) : undefined;
  const movimientos = idProducto
    ? await inventarioModel.listarPorProducto(idProducto)
    : await inventarioModel.listarTodos();

  if (req.query.formato === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment('kardex.csv');
    res.send(toCsv(movimientos as unknown as Record<string, unknown>[]));
    return;
  }

  return ok(res, movimientos);
}

/** Ajuste manual de stock (reposición, merma, corrección de conteo físico), hecho por almacén/administrador. */
export async function ajusteManual(req: AuthRequest, res: Response): Promise<Response> {
  const { id_producto, tipo, cantidad, motivo } = req.body;

  if (!id_producto || !tipo || !cantidad || cantidad <= 0 || !motivo) {
    return fail(res, 'id_producto, tipo, cantidad (> 0) y motivo son obligatorios', 422);
  }
  if (!['entrada', 'salida'].includes(tipo)) {
    return fail(res, 'tipo debe ser "entrada" o "salida"', 422);
  }

  const producto = await productosModel.buscarPorId(id_producto);
  if (!producto) return fail(res, 'Producto no encontrado', 404);

  if (tipo === 'salida' && producto.stock < cantidad) {
    return fail(res, `Stock insuficiente. Disponible: ${producto.stock}`, 409);
  }

  const stockAnterior = producto.stock;
  if (tipo === 'salida') {
    await productosModel.descontarStock(pool, id_producto, cantidad);
  } else {
    await productosModel.incrementarStock(pool, id_producto, cantidad);
  }
  const stockResultante = tipo === 'salida' ? stockAnterior - cantidad : stockAnterior + cantidad;

  const idMovimiento = await inventarioModel.registrarMovimiento(pool, {
    id_producto,
    tipo,
    cantidad,
    stock_anterior: stockAnterior,
    stock_resultante: stockResultante,
    motivo,
    id_usuario: req.usuario!.id,
  });

  return ok(res, { id: idMovimiento, stock_resultante: stockResultante }, 201);
}
