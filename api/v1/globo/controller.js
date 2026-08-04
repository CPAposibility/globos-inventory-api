import { Globo, Marca, Estilo, Tamano, Color } from "../models/index.js";

const includeCatalogo = [Marca, Estilo, Tamano, Color];

const controller = {
  all: async (req, res, next) => {
    try {
      const { id_marca } = req.query;
      const where = id_marca ? { id_marca } : {};
      const data = await Globo.findAll({ where, include: includeCatalogo });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const {
        id_marca, id_estilo, id_tamano, id_color,
        costo_mayoreo, costo_menudeo, costo_caja, costo_media
      } = req.body;
      const nuevo = await Globo.create({
        id_marca, id_estilo, id_tamano, id_color,
        costo_mayoreo, costo_menudeo, costo_caja, costo_media
      });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id, { include: includeCatalogo });
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      await item.update(req.body);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      await item.destroy();
      res.json({ message: "Globo eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
