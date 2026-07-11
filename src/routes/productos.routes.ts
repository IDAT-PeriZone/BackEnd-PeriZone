import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

// Catálogo público (RF03/RF04). Debe ir antes de "/:id" y "/admin".
router.get('/', asyncHandler(productosController.listarCatalogo));

// Sección "Productos" del panel: administrador y almacén, incluye inactivos.
router.get(
  '/admin',
  auth,
  requireRole('administrador', 'almacen'),
  asyncHandler(productosController.listarAdmin)
);

router.get('/:id', asyncHandler(productosController.obtener));

router.post('/', auth, requireRole('administrador', 'almacen'), asyncHandler(productosController.crear));
router.put('/:id', auth, requireRole('administrador', 'almacen'), asyncHandler(productosController.actualizar));
router.delete('/:id', auth, requireRole('administrador', 'almacen'), asyncHandler(productosController.eliminar));
router.post(
  '/:id/imagenes',
  auth,
  requireRole('administrador', 'almacen'),
  asyncHandler(productosController.agregarImagen)
);

export default router;
