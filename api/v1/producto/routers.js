import { Router } from "express";
import multer from "multer";
import controller from "./controller.js";

const router = Router();

// Las fotos llegan en memoria (no se guardan en disco: el controller las
// manda directo a Azure Blob Storage). El navegador ya las comprime a
// máx. 1600 px, así que 10 MB es un tope de sobra.
// Si tu api/v1/globo/routers.js usa otro límite, iguálalo aquí.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", controller.all);
router.post("/", controller.create);
router.get("/:id", controller.read);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// "foto" debe coincidir con el nombre del campo que manda el frontend (FormData).
router.post("/:id/foto", upload.single("foto"), controller.subirFoto);

export default router;
