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

const router = Router();

router.use('/v1/marca', marcaRoutes);
router.use('/v1/estilo', estiloRoutes);
router.use('/v1/tamano', tamanoRoutes);
router.use('/v1/color', colorRoutes);
router.use('/v1/globo', globoRoutes);
router.use('/v1/ubicacion', ubicacionRoutes);
router.use('/v1/movimiento', movimientoRoutes);
router.use('/v1/inventario', inventarioRoutes);

// Nota: el módulo "task" que tenías antes era una plantilla genérica,
// no corresponde al dominio de esta app — se quitó de aquí.
// Si ya no lo usas en ningún lado, puedes borrar la carpeta v1/task.

export default router;
