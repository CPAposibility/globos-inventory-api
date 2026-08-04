import { Marca } from "../models/index.js";

const controller = {
  all: async (req, res, next) => {
    try {
      const data = await Marca.findAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const { nombre } = req.body;
      const nuevo = await Marca.create({ nombre });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Marca.findByPk(id);
      if (!item) return res.status(404).json({ message: "Marca no encontrada" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre } = req.body;
      const item = await Marca.findByPk(id);
      if (!item) return res.status(404).json({ message: "Marca no encontrada" });
      await item.update({ nombre });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Marca.findByPk(id);
      if (!item) return res.status(404).json({ message: "Marca no encontrada" });
      await item.destroy();
      res.json({ message: "Marca eliminada", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
