import { Tamano } from "../models/index.js";

const controller = {
  all: async (req, res, next) => {
    try {
      const data = await Tamano.findAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { tamano } = req.body;
      const nuevo = await Tamano.create({ tamano });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Tamano.findByPk(id);
      if (!item) return res.status(404).json({ message: "Tamaño no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tamano } = req.body;
      const item = await Tamano.findByPk(id);
      if (!item) return res.status(404).json({ message: "Tamaño no encontrado" });
      await item.update({ tamano });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Tamano.findByPk(id);
      if (!item) return res.status(404).json({ message: "Tamaño no encontrado" });
      await item.destroy();
      res.json({ message: "Tamaño eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
