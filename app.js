// server/app.js
// Punto de entrada del servidor
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Importa la conexión y registra las asociaciones entre modelos
// una sola vez, al arrancar el servidor.
import "./api/v1/config/db.js";
import "./api/v1/models/index.js";

import apiRouter from "./api/index.js";

const app = express();

app.use(cors());
app.use(express.json());

// Todas las rutas quedan bajo /api, ej: /api/v1/movimiento
app.use("/api", apiRouter);

// Ruta de salud simple, útil para probar que el server responde
app.get("/", (req, res) => {
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
