import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Estilo = sequelize.define("Estilo", {
  id_estilo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  estilo: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  tableName: "estilo",
  timestamps: false
});

export default Estilo;
