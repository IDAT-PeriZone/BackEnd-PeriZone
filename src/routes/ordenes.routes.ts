import { Router } from 'express';
import * as ordenesController from '../controllers/ordenes.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

router.use(auth);

router.post('/', asyncHandler(ordenesController.checkout));
router.get('/mias', asyncHandler(ordenesController.misOrdenes));
router.get('/', requireRole('administrador', 'finanzas', 'almacen'), asyncHandler(ordenesController.listarTodas));
router.get('/:id', asyncHandler(ordenesController.obtener));
router.patch(
  '/:id/estado',
  requireRole('administrador', 'almacen'),
  asyncHandler(ordenesController.cambiarEstado)
);

export default router;
