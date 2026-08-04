import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Globo = sequelize.define("Globo", {
  id_globo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_marca: DataTypes.INTEGER,
  id_estilo: DataTypes.INTEGER,
  id_tamano: DataTypes.INTEGER,
  id_color: DataTypes.INTEGER,
  costo_mayoreo: DataTypes.DECIMAL,
  costo_menudeo: DataTypes.DECIMAL,
  costo_caja: DataTypes.DECIMAL,
  costo_media: DataTypes.DECIMAL
}, {
  tableName: "globo",
  timestamps: false
});

export default Globo;
