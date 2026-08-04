import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Marca = sequelize.define("Marca", {
  id_marca: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  }
}, {
  tableName: "marca",
  timestamps: false
});

export default Marca;
