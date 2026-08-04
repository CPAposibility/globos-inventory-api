import { Ubicacion } from "../models/index.js";

const controller = {
  // Soporta filtrar por tipo: GET /v1/ubicacion?tipo=tienda
  all: async (req, res, next) => {
    try {
      const { tipo } = req.query;
      const where = tipo ? { tipo } : {};
      const data = await Ubicacion.findAll({ where });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { nombre, tipo } = req.body;
      const nuevo = await Ubicacion.create({ nombre, tipo });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Ubicacion.findByPk(id);
      if (!item) return res.status(404).json({ message: "Ubicación no encontrada" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, tipo } = req.body;
      const item = await Ubicacion.findByPk(id);
      if (!item) return res.status(404).json({ message: "Ubicación no encontrada" });
      await item.update({ nombre, tipo });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Ubicacion.findByPk(id);
      if (!item) return res.status(404).json({ message: "Ubicación no encontrada" });
      await item.destroy();
      res.json({ message: "Ubicación eliminada", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
