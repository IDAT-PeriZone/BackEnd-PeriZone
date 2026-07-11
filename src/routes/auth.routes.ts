import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';

const router = Router();

router.post('/registro', asyncHandler(authController.registrar));
router.post('/login', asyncHandler(authController.login));
router.get('/perfil', auth, asyncHandler(authController.perfil));
router.post('/recuperar-contrasenia', asyncHandler(authController.solicitarRecuperacion));
router.post('/restablecer-contrasenia', asyncHandler(authController.restablecerContrasenia));

export default router;
