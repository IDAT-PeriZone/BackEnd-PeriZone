import { Router } from 'express';
import * as carritoController from '../controllers/carrito.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(carritoController.ver));
router.post('/items', asyncHandler(carritoController.agregarItem));
router.put('/items/:idProducto', asyncHandler(carritoController.actualizarItem));
router.delete('/items/:idProducto', asyncHandler(carritoController.quitarItem));
router.delete('/', asyncHandler(carritoController.vaciar));

export default router;
