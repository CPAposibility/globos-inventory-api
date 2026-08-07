// server/app.js
// Punto de entrada del servidor
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Importa la conexión y registra las asociaciones entre modelos
// una sola vez, al arrancar el servidor.
import "./api/v1/config/db.js";
import "./api/v1/models/index.js";
import apiRouter from "./api/index.js";

// __dirname no existe de forma nativa en ES Modules, hay que reconstruirlo
// a partir de import.meta.url. Lo necesitamos para armar la ruta absoluta
// hacia la carpeta frontend/ sin importar desde dónde se ejecute el server.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Sirve todos los archivos de la carpeta frontend/ (formulario2.html,
// form-globos.js, config.js, styles/, etc.) como archivos estáticos.
// Esto permite que, por ejemplo, formulario2.html quede accesible en:
//   https://elguateque-fyaqardhawbtdxgw.mexicocentral-01.azurewebsites.net/formulario2.html
// desde cualquier dispositivo con internet, no solo desde tu máquina.
app.use(express.static(path.join(__dirname, "frontend")));

// Todas las rutas de la API quedan bajo /api, ej: /api/v1/movimiento
app.use("/api", apiRouter);

// Ruta de salud simple, útil para probar que el server responde
app.get("/health", (req, res) => {
  res.json({ message: "API de control de inventario de globos - activa" });
});

// Manejador de errores centralizado
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
