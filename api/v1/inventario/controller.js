import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

// inventario_actual es una VISTA calculada (no una tabla), por eso se
// consulta con SQL directo en vez de un modelo de Sequelize con CRUD.
const controller = {
  // GET /v1/inventario?id_globo=1&id_ubicacion=2
  all: async (req, res, next) => {
    try {
      const { id_globo, id_ubicacion } = req.query;
      const conditions = [];
      const replacements = {};

      if (id_globo) {
        conditions.push("id_globo = :id_globo");
        replacements.id_globo = id_globo;
      }
      if (id_ubicacion) {
        conditions.push("id_ubicacion = :id_ubicacion");
        replacements.id_ubicacion = id_ubicacion;
      }

      let sql = "SELECT * FROM inventario_actual";
      if (conditions.length) sql += " WHERE " + conditions.join(" AND ");

      const data = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
