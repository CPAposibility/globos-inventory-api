import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Movimiento = sequelize.define("Movimiento", {
  id_movimiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_globo: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_ubicacion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_movimiento: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [["entrada", "salida"]] }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  nota: DataTypes.STRING(200)
}, {
  tableName: "movimiento",
  timestamps: false
});

export default Movimiento;
