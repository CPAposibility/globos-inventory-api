import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Ubicacion = sequelize.define("Ubicacion", {
  id_ubicacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [["almacen", "tienda"]] }
  }
}, {
  tableName: "ubicacion",
  timestamps: false
});

export default Ubicacion;
