import { Color, Marca } from "../models/index.js";
const controller = {
  // Soporta filtrar por marca: GET /v1/color?id_marca=1
  // (clave para que el formulario solo muestre colores de la marca elegida)
  all: async (req, res, next) => {
    try {
      const { id_marca } = req.query;
      // 🔍 Diagnóstico temporal
      const [diag] = await Color.sequelize.query(
        "SELECT current_database() AS db, current_schema() AS schema, current_user AS usr, inet_server_addr() AS server_ip, inet_server_port() AS server_port, pg_postmaster_start_time() AS server_start, (SELECT count(*) FROM public.color) AS conteo_public_color;"
      );
      console.log("🔍 DIAGNOSTICO:", diag);
      const where = id_marca ? { id_marca } : {};
      const data = await Color.findAll({ where, include: Marca });
      console.log("🟡 DATA length:", data.length);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { id_marca, color } = req.body;
      const nuevo = await Color.create({ id_marca, color });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Color.findByPk(id, { include: Marca });
      if (!item) return res.status(404).json({ message: "Color no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { id_marca, color } = req.body;
      const item = await Color.findByPk(id);
      if (!item) return res.status(404).json({ message: "Color no encontrado" });
      await item.update({ id_marca, color });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Color.findByPk(id);
      if (!item) return res.status(404).json({ message: "Color no encontrado" });
      await item.destroy();
      res.json({ message: "Color eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};
export default controller;
