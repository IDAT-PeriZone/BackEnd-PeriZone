import { Router } from 'express';
import * as direccionesController from '../controllers/direcciones.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren un cliente autenticado: cada quien administra sus propias direcciones.
router.use(auth);

router.get('/', asyncHandler(direccionesController.listar));
router.post('/', asyncHandler(direccionesController.crear));
router.put('/:id', asyncHandler(direccionesController.actualizar));
router.delete('/:id', asyncHandler(direccionesController.eliminar));

export default router;
