import { Router } from "express";
import controller from "./controller.js";

const router = Router();

router.get("/", controller.all);
router.post("/", controller.create);
router.delete("/:id", controller.remove);

export default router;
