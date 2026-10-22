// server/api/index.js
import { Router } from 'express';
import marcaRoutes from './v1/marca/routers.js';
import estiloRoutes from './v1/estilo/routers.js';
import tamanoRoutes from './v1/tamano/routers.js';
import colorRoutes from './v1/color/routers.js';
import globoRoutes from './v1/globo/routers.js';
import ubicacionRoutes from './v1/ubicacion/routers.js';
import movimientoRoutes from './v1/movimiento/routers.js';
import inventarioRoutes from './v1/inventario/routers.js';
import authRoutes from './v1/auth/routers.js';
import productoRoutes from './v1/producto/routers.js';
import grupoRoutes from './v1/grupo/routers.js';
import movimientoProductoRoutes from './v1/movimientoProducto/routers.js';
import inventarioProductoRoutes from './v1/inventarioProducto/routers.js';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/marca', marcaRoutes);
router.use('/v1/estilo', estiloRoutes);
router.use('/v1/tamano', tamanoRoutes);
router.use('/v1/color', colorRoutes);
router.use('/v1/globo', globoRoutes);
router.use('/v1/ubicacion', ubicacionRoutes);
router.use('/v1/movimiento', movimientoRoutes);
router.use('/v1/inventario', inventarioRoutes);
router.use('/v1/producto', productoRoutes);
router.use('/v1/grupo', grupoRoutes);
router.use('/v1/movimiento-producto', movimientoProductoRoutes);
router.use('/v1/inventario-producto', inventarioProductoRoutes);

export default router;
