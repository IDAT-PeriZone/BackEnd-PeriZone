import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

// Lectura pública: la tienda necesita listar categorías sin autenticación.
router.get('/', asyncHandler(categoriasController.listar));
router.get('/:id', asyncHandler(categoriasController.obtener));

// Gestión del catálogo: solo administrador y almacén.
router.post('/', auth, requireRole('administrador', 'almacen'), asyncHandler(categoriasController.crear));
router.put('/:id', auth, requireRole('administrador', 'almacen'), asyncHandler(categoriasController.actualizar));
router.delete('/:id', auth, requireRole('administrador', 'almacen'), asyncHandler(categoriasController.eliminar));

export default router;
