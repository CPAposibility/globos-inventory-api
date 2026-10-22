// -------------------------------------------------------------
//  Archivo: producto.js
//  Ubicación: server/api/v1/models/producto.js
//  Función: Modelo de la tabla "producto": el catálogo de las
//  secciones nuevas (Batukada, CD-5, etc.). Los globos clásicos
//  NO viven aquí, siguen en la tabla "globo".
// -------------------------------------------------------------
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Producto = sequelize.define("Producto", {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_seccion: { type: DataTypes.INTEGER, allowNull: false },

  // Opcional: Batukada no usa grupos, CD-5 sí (Personajes, Eventos...).
  id_grupo: { type: DataTypes.INTEGER, allowNull: true },

  nombre: { type: DataTypes.STRING(100), allowNull: false },
  codigo_interno: { type: DataTypes.STRING(50), allowNull: true },

  // Cuántas piezas trae un paquete (Batukada = 12, CD-5 = 5). La app
  // lo usa para convertir "paquetes" a piezas al registrar movimientos.
  piezas_por_paquete: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12 },

  foto_url: { type: DataTypes.STRING(500), allowNull: true },

  // false = producto descontinuado: deja de salir en los formularios,
  // pero su historial de movimientos se conserva.
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: "producto",
  timestamps: false
});

export default Producto;
