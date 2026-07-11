import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

router.use(auth, requireRole('administrador', 'almacen'));

router.get('/', asyncHandler(inventarioController.listar));
router.post('/ajustes', asyncHandler(inventarioController.ajusteManual));

export default router;
