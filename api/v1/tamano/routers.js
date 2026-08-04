import { Router } from "express";
import controller from "./controller.js";

const router = Router();

router.get("/", controller.all);
router.post("/", controller.create);
router.get("/:id", controller.read);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;
