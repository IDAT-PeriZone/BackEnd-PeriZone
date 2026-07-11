import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';

const router = Router();

router.use(auth, requireRole('administrador', 'marketing'));

router.get('/', asyncHandler(usuariosController.listar));
router.get('/:id', asyncHandler(usuariosController.obtener));
router.post('/', requireRole('administrador'), asyncHandler(usuariosController.crearInterno));
router.put('/:id', asyncHandler(usuariosController.actualizar));
router.delete('/:id', requireRole('administrador'), asyncHandler(usuariosController.desactivar));

export default router;
