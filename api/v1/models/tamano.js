import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Tamano = sequelize.define("Tamano", {
  id_tamano: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tamano: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "tamano",
  timestamps: false
});

export default Tamano;
