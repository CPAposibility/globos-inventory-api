// -------------------------------------------------------------
//  Archivo: db.js
//  Ubicación: server/api/v1/config/db.js
//  Función: Configurar y exportar la conexión a Azure PostgreSQL
// -------------------------------------------------------------
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  }
);

sequelize
.authenticate()
.then(() => console.log("✅ Conectado a Azure PostgreSQL"))
.catch((err) => console.error("❌ Error al conectar a Azure:", err));

console.log("🔎 DB_NAME:", process.env.DB_NAME, "| DB_HOST:", process.env.DB_HOST, "| DB_USER:", process.env.DB_USER);
export default sequelize;
