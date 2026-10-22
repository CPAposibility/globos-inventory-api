// -------------------------------------------------------------
//  Archivo: movimientoProducto.js
//  Ubicación: server/api/v1/models/movimientoProducto.js
//  Función: Modelo de la tabla "movimiento_producto": entradas y
//  salidas de los productos de las secciones nuevas.
//  (Los movimientos de globos clásicos siguen en "movimiento".)
// -------------------------------------------------------------
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const MovimientoProducto = sequelize.define("MovimientoProducto", {
  id_movimiento_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_producto: { type: DataTypes.INTEGER, allowNull: false },
  id_ubicacion: { type: DataTypes.INTEGER, allowNull: false },

  // Se llena en el backend con el usuario de la sesión (igual que en
  // "movimiento"): nunca se acepta un id_usuario que mande el frontend.
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },

  // "entrada" suma al inventario, "salida" resta.
  tipo: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [["entrada", "salida"]] }
  },

  // SIEMPRE en PIEZAS (entero positivo), aunque en el formulario se
  // capture en paquetes: el backend convierte paquetes -> piezas.
  // Así un paquete de CD-5 (5 piezas) y una pieza suelta usan la misma unidad.
  piezas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },

  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "movimiento_producto",
  timestamps: false
});

export default MovimientoProducto;
