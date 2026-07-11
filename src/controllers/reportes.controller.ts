import { Response, Request } from 'express';
import * as reportesModel from '../models/reportes.model';
import * as productosModel from '../models/productos.model';
import { ok, fail } from '../utils/response';
import { toCsv } from '../utils/csv';

/** RF10 + "Dashboard general": totales del día para las 4 tarjetas resumen del panel. */
export async function dashboard(_req: Request, res: Response): Promise<Response> {
  const resumen = await reportesModel.obtenerResumenDashboard();
  return ok(res, resumen);
}

/** RF10: ventas agrupadas por día en un rango de fechas (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD). */
export async function ventas(req: Request, res: Response): Promise<Response | void> {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return fail(res, 'los parámetros desde y hasta (YYYY-MM-DD) son obligatorios', 422);
  }

  const datos = await reportesModel.ventasPorPeriodo(String(desde), String(hasta));

  if (req.query.formato === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment('reporte-ventas.csv');
    res.send(toCsv(datos as unknown as Record<string, unknown>[]));
    return;
  }

  return ok(res, datos);
}

/** RF10: productos con mayor movimiento. */
export async function productosMasVendidos(req: Request, res: Response): Promise<Response> {
  const limite = req.query.limite ? Number(req.query.limite) : 10;
  const datos = await reportesModel.productosMasVendidos(limite);
  return ok(res, datos);
}

/** Alertas de inventario mínimo (sección Productos / Dashboard del panel). */
export async function stockCritico(_req: Request, res: Response): Promise<Response> {
  const productos = await productosModel.listarStockCritico();
  return ok(res, productos);
}
