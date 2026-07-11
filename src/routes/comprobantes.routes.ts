import { Router } from 'express';
import * as comprobantesController from '../controllers/comprobantes.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';

const router = Router();

router.use(auth);
router.get('/orden/:idOrden', asyncHandler(comprobantesController.obtenerPorOrden));

export default router;
