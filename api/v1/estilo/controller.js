import { Estilo } from "../models/index.js";

const controller = {
  all: async (req, res, next) => {
    try {
      const data = await Estilo.findAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { estilo } = req.body;
      const nuevo = await Estilo.create({ estilo });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Estilo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Estilo no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { estilo } = req.body;
      const item = await Estilo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Estilo no encontrado" });
      await item.update({ estilo });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Estilo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Estilo no encontrado" });
      await item.destroy();
      res.json({ message: "Estilo eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
