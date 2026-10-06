import { Router } from "express";
import rateLimit from "express-rate-limit";
import controller from "./controller.js";
import requireAuth from "../middlewares/requireAuth.js";

const router = Router();

// Protección contra fuerza bruta: máximo 5 intentos de login por
// minuto, contados por dirección IP. Si alguien (o un bot) intenta
// adivinar contraseñas a repetición, se le bloquea temporalmente en
// vez de dejarlo probar sin límite. No afecta el uso normal — un
// empleado real nunca falla su contraseña 5 veces en un minuto.
const limitadorLogin = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5,
    message: { message: "Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo." },
    standardHeaders: true,
    legacyHeaders: false
});

// Públicas: no requieren sesión (obviamente, para loguearse aún no la hay)
router.post("/login", limitadorLogin, controller.login);
router.post("/logout", controller.logout);

// Requiere sesión válida: pregunta "¿quién soy?"
router.get("/me", requireAuth, controller.me);

export default router;
