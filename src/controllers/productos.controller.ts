import { Request, Response } from 'express';
import * as productosModel from '../models/productos.model';
import { ok, fail } from '../utils/response';
import { toCsv } from '../utils/csv';

function parseFiltros(req: Request, soloActivos: boolean): productosModel.FiltrosProducto {
  const { categoria, precioMin, precioMax, buscar } = req.query;
  return {
    soloActivos,
    categoria: categoria ? Number(categoria) : undefined,
    precioMin: precioMin ? Number(precioMin) : undefined,
    precioMax: precioMax ? Number(precioMax) : undefined,
    buscar: typeof buscar === 'string' ? buscar : undefined,
  };
}

/** RF03/RF04: catálogo público de la tienda (siempre solo productos activos). */
export async function listarCatalogo(req: Request, res: Response): Promise<Response> {
  const productos = await productosModel.listar(parseFiltros(req, true));
  return ok(res, productos);
}

/** Sección "Productos" del panel admin: incluye también productos inactivos/dados de baja. */
export async function listarAdmin(req: Request, res: Response): Promise<Response | void> {
  const productos = await productosModel.listar(parseFiltros(req, false));

  if (req.query.formato === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment('productos.csv');
    res.send(toCsv(productos as unknown as Record<string, unknown>[]));
    return;
  }

  return ok(res, productos);
}

export async function obtener(req: Request, res: Response): Promise<Response> {
  const producto = await productosModel.buscarPorId(Number(req.params.id));
  if (!producto) return fail(res, 'Producto no encontrado', 404);

  const imagenes = await productosModel.listarImagenes(producto.id);
  return ok(res, { ...producto, imagenes });
}

export async function crear(req: Request, res: Response): Promise<Response> {
  const { id_categoria, nombre, descripcion, precio, stock, stock_minimo, imagen_url } = req.body;
  if (!id_categoria || !nombre || precio === undefined || stock === undefined) {
    return fail(res, 'id_categoria, nombre, precio y stock son obligatorios', 422);
  }

  const id = await productosModel.crear({
    id_categoria,
    nombre,
    descripcion,
    precio,
    stock,
    stock_minimo,
    imagen_url,
  });
  const producto = await productosModel.buscarPorId(id);
  return ok(res, producto, 201);
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  await productosModel.actualizar(Number(req.params.id), req.body);
  const producto = await productosModel.buscarPorId(Number(req.params.id));
  return ok(res, producto);
}

/** Baja lógica: el producto deja de ser visible en el catálogo pero conserva su historial de órdenes/kardex. */
export async function eliminar(req: Request, res: Response): Promise<Response> {
  await productosModel.eliminar(Number(req.params.id));
  return ok(res, { mensaje: 'Producto dado de baja' });
}

export async function agregarImagen(req: Request, res: Response): Promise<Response> {
  const { imagen_url, orden } = req.body;
  if (!imagen_url) return fail(res, 'imagen_url es obligatorio', 422);
  const id = await productosModel.agregarImagen(Number(req.params.id), imagen_url, orden ?? 0);
  return ok(res, { id }, 201);
}
