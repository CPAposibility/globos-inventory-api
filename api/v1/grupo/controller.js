import { Grupo, Seccion } from "../models/index.js";

// Grupos dentro de una sección (ej. CD-5 -> Personajes, Eventos, Equipo de fútbol).
const controller = {
  /**
   * GET /api/v1/grupo?clave=cd5   (o ?id_seccion=6)
   * Lista los grupos de una sección, en el orden definido por la columna "orden".
   * Es público (GET), igual que el resto del catálogo.
   */
  all: async (req, res, next) => {
    try {
      const { id_seccion, clave } = req.query;
      const where = {};
      if (id_seccion) where.id_seccion = id_seccion;

      // Si llega "clave", filtramos uniendo con la tabla seccion.
      const include = clave
        ? [{ model: Seccion, where: { clave }, attributes: ["id_seccion", "clave"] }]
        : [];

      const data = await Grupo.findAll({
        where,
        include,
        order: [["orden", "ASC"], ["nombre", "ASC"]]
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/grupo        (solo admin, lo valida apiGuard)
   * Body: { clave | id_seccion, nombre, orden? }
   * Crea un grupo nuevo dentro de una sección.
   */
  create: async (req, res, next) => {
    try {
      const { id_seccion, clave, nombre, orden } = req.body;
      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ message: "El nombre del grupo es obligatorio" });
      }

      const seccion = id_seccion
        ? await Seccion.findByPk(id_seccion)
        : await Seccion.findOne({ where: { clave } });
      if (!seccion) return res.status(400).json({ message: "La sección indicada no existe" });

      const nuevo = await Grupo.create({
        id_seccion: seccion.id_seccion,
        nombre: String(nombre).trim(),
        orden: Number.isInteger(orden) ? orden : 0
      });
      res.status(201).json(nuevo);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ message: "Ya existe un grupo con ese nombre en esta sección" });
      }
      next(err);
    }
  },

  /**
   * DELETE /api/v1/grupo/:id   (solo admin)
   * Un grupo con productos no se puede borrar (la llave foránea lo impide):
   * primero hay que borrar o mover sus productos.
   */
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Grupo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Grupo no encontrado" });
      await item.destroy();
      res.json({ message: "Grupo eliminado", id });
    } catch (err) {
      if (err.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({ message: "Este grupo todavía tiene productos; elimínalos primero" });
      }
      next(err);
    }
  }
};

export default controller;
