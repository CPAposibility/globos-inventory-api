import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Color = sequelize.define("Color", {
  id_color: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_marca: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  tableName: "color",
  timestamps: false
});

export default Color;
