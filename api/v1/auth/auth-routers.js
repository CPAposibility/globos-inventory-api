import { Router } from "express";
import controller from "./controller.js";
import requireAuth from "../middlewares/requireAuth.js";

const router = Router();

// Públicas: no requieren sesión (obviamente, para loguearse aún no la hay)
router.post("/login", controller.login);
router.post("/logout", controller.logout);

// Requiere sesión válida: pregunta "¿quién soy?"
router.get("/me", requireAuth, controller.me);

export default router;
