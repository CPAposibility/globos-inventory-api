import { QueryTypes } from "sequelize";
import sequelize from "../config/db.js";

const controller = {
  /**
   * GET /api/v1/inventario-producto?id_producto=1&id_ubicacion=2&id_seccion=4&id_grupo=3
   * Lee la vista inventario_producto_actual (stock por producto y ubicación).
   * Cada fila trae: piezas totales, paquetes completos y piezas sueltas.
   * Todos los filtros son opcionales. Es público (GET).
   */
  all: async (req, res, next) => {
    try {
      const FILTROS = ["id_producto", "id_ubicacion", "id_seccion", "id_grupo"];
      const condiciones = [];
      const replacements = {};

      for (const campo of FILTROS) {
        const valor = req.query[campo];
        if (valor !== undefined && valor !== "") {
          const numero = parseInt(valor, 10);
          if (!Number.isInteger(numero)) {
            return res.status(400).json({ message: `${campo} debe ser un número` });
          }
          // Los nombres de columna salen de la lista fija FILTROS (nunca del
          // usuario) y el valor va como parámetro: no hay inyección SQL.
          condiciones.push(`${campo} = :${campo}`);
          replacements[campo] = numero;
        }
      }

      const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
      const filas = await sequelize.query(
        `SELECT * FROM inventario_producto_actual ${where} ORDER BY nombre, id_ubicacion`,
        { replacements, type: QueryTypes.SELECT }
      );

      // Postgres regresa SUM/división como texto (bigint); los pasamos a número.
      res.json(filas.map((f) => ({
        ...f,
        piezas: Number(f.piezas),
        paquetes_completos: Number(f.paquetes_completos),
        piezas_sueltas: Number(f.piezas_sueltas)
      })));
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
