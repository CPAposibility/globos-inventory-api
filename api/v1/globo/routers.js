import { Router } from "express";
import multer from "multer";
import controller from "./controller.js";

const router = Router();

// multer.memoryStorage() guarda el archivo en memoria (req.file.buffer)
// en vez de escribirlo a disco — necesario porque Azure App Service no
// tiene almacenamiento persistente; el archivo se sube directo desde
// memoria hacia Azure Blob Storage (ver config/blobStorage.js).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo por foto
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen"));
    }
    cb(null, true);
  }
});

router.get("/", controller.all);
router.post("/", controller.create);
router.get("/:id", controller.read);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// upload.single("foto") espera que el frontend mande el archivo bajo
// la clave "foto" dentro de un FormData (no como JSON normal).
router.post("/:id/foto", upload.single("foto"), controller.subirFoto);

export default router;
