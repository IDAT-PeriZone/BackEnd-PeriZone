import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import direccionesRoutes from './routes/direcciones.routes';
import categoriasRoutes from './routes/categorias.routes';
import productosRoutes from './routes/productos.routes';
import carritoRoutes from './routes/carrito.routes';
import ordenesRoutes from './routes/ordenes.routes';
import comprobantesRoutes from './routes/comprobantes.routes';
import inventarioRoutes from './routes/inventario.routes';
import reportesRoutes from './routes/reportes.routes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'PeriZone API corriendo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/comprobantes', comprobantesRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reportes', reportesRoutes);

// Debe ir al final: captura los errores lanzados por asyncHandler en cualquier ruta.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
