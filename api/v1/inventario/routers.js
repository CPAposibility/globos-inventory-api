import { Router } from "express";
import controller from "./controller.js";

const router = Router();

// Solo lectura: el stock se calcula desde movimiento, nunca se edita directo
router.get("/", controller.all);

export default router;
