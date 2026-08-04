import { Movimiento, Globo, Ubicacion } from "../models/index.js";

const TIPOS_VALIDOS = ["entrada", "salida"];

const controller = {
  // Soporta filtrar: GET /v1/movimiento?id_globo=1&id_ubicacion=2
  all: async (req, res, next) => {
    try {
      const { id_globo, id_ubicacion, tipo_movimiento } = req.query;
      const where = {};
      if (id_globo) where.id_globo = id_globo;
      if (id_ubicacion) where.id_ubicacion = id_ubicacion;
      if (tipo_movimiento) where.tipo_movimiento = tipo_movimiento;

      const data = await Movimiento.findAll({
        where,
        include: [Globo, Ubicacion],
        order: [["fecha", "DESC"]]
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  // El endpoint más importante del MVP: registrar entrada o salida
  create: async (req, res, next) => {
    try {
      const { id_globo, id_ubicacion, tipo_movimiento, cantidad, nota } = req.body;

      if (!TIPOS_VALIDOS.includes(tipo_movimiento)) {
        return res.status(400).json({
          message: "tipo_movimiento debe ser 'entrada' o 'salida'"
        });
      }
      if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ message: "cantidad debe ser mayor a 0" });
      }
      if (!id_globo || !id_ubicacion) {
        return res.status(400).json({ message: "id_globo e id_ubicacion son obligatorios" });
      }

      const nuevo = await Movimiento.create({
        id_globo, id_ubicacion, tipo_movimiento, cantidad, nota
      });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Movimiento.findByPk(id, { include: [Globo, Ubicacion] });
      if (!item) return res.status(404).json({ message: "Movimiento no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  // Nota: normalmente un movimiento NO se edita (es un historial contable),
  // pero se deja disponible por si necesitas corregir una nota o un error de captura
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Movimiento.findByPk(id);
      if (!item) return res.status(404).json({ message: "Movimiento no encontrado" });
      await item.update(req.body);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Movimiento.findByPk(id);
      if (!item) return res.status(404).json({ message: "Movimiento no encontrado" });
      await item.destroy();
      res.json({ message: "Movimiento eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
