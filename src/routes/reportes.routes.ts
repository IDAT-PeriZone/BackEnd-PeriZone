import { Router } from 'express';
import * as reportesController from '../controllers/reportes.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

router.use(auth);

// Dashboard general: visible para los 4 roles internos del panel.
router.get(
  '/dashboard',
  requireRole('administrador', 'finanzas', 'almacen', 'marketing'),
  asyncHandler(reportesController.dashboard)
);

// Sección "Reportes": administrador, finanzas y marketing.
router.get(
  '/ventas',
  requireRole('administrador', 'finanzas', 'marketing'),
  asyncHandler(reportesController.ventas)
);
router.get(
  '/productos-mas-vendidos',
  requireRole('administrador', 'finanzas', 'marketing'),
  asyncHandler(reportesController.productosMasVendidos)
);

// Alertas de stock crítico: administrador y almacén.
router.get(
  '/stock-critico',
  requireRole('administrador', 'almacen'),
  asyncHandler(reportesController.stockCritico)
);

export default router;
