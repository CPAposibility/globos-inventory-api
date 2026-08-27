import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Definición del modelo Globo — representa el catálogo de SKUs:
// cada combinación única de marca + estilo + tamaño + color.
//
// IMPORTANTE: cualquier columna que exista en la tabla real de PostgreSQL
// pero que NO esté declarada aquí abajo será ignorada por Sequelize.
// No da error — simplemente descarta el dato silenciosamente al hacer
// create()/update(). Por eso, cada vez que se agregue una columna nueva
// vía migración, hay que reflejarla también en este archivo.
const Globo = sequelize.define("Globo", {
  id_globo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // Claves foráneas hacia los catálogos relacionados
  id_marca: DataTypes.INTEGER,
  id_estilo: DataTypes.INTEGER,
  id_tamano: DataTypes.INTEGER,
  id_color: DataTypes.INTEGER,

  // Código autogenerado por el frontend (ej. "CIE-RED-09-ROJ"),
  // combina marca+estilo+tamaño+color en un identificador legible.
  // Se agregó vía migración a la tabla, pero faltaba declararlo aquí
  // — por eso el backend lo recibía pero nunca lo guardaba.
  codigo_interno: DataTypes.STRING,

  // Costos por distintos canales de venta (pueden quedar en null
  // si todavía no se definen precios para ese SKU)
  costo_mayoreo: DataTypes.DECIMAL,
  costo_menudeo: DataTypes.DECIMAL,
  costo_caja: DataTypes.DECIMAL,
  costo_media: DataTypes.DECIMAL,

  // URL pública de la foto de referencia en Azure Blob Storage.
  // Reglas de negocio (aplicadas en el controller, no aquí):
  //   - Cualquier usuario logueado puede subir la PRIMERA foto
  //   - Si ya existe una, solo "admin" puede reemplazarla
  foto_url: DataTypes.STRING(500)
}, {
  tableName: "globo",   // nombre real de la tabla en PostgreSQL
  timestamps: false     // esta tabla no usa createdAt/updatedAt
});

export default Globo;
