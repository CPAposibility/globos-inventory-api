// -------------------------------------------------------------
//  Archivo: seccion.js
//  Ubicación: server/api/v1/models/seccion.js
//  Función: Modelo de la tabla "seccion" (Globos, Personajes, Arcos,
//  Batukada, Artículos de luz, CD-5). Solo se lee: las 6 secciones
//  se crearon con el SQL inicial y no se administran desde la app.
// -------------------------------------------------------------
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Seccion = sequelize.define("Seccion", {
  id_seccion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Identificador corto y estable (ej. "batukada", "cd5"). El frontend y
  // el backend usan esta clave en vez del id numérico para encontrar la sección.
  clave: { type: DataTypes.STRING(30), allowNull: false, unique: true },

  nombre: { type: DataTypes.STRING(60), allowNull: false },
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: "seccion",
  timestamps: false
});

export default Seccion;
