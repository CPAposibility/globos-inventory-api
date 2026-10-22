// -------------------------------------------------------------
//  Archivo: grupo.js
//  Ubicación: server/api/v1/models/grupo.js
//  Función: Modelo de la tabla "grupo". Un grupo agrupa productos
//  dentro de una sección. Ejemplo en CD-5: el grupo "Eventos"
//  contiene Bautizo, Comunión, Boda...
// -------------------------------------------------------------
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Grupo = sequelize.define("Grupo", {
  id_grupo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_seccion: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(60), allowNull: false },
  // Define el orden en que aparecen los grupos en el selector del formulario.
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 }
}, {
  tableName: "grupo",
  timestamps: false
});

export default Grupo;
