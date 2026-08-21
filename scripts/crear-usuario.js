// scripts/crear-usuario.js
//
// Script de una sola vez para crear usuarios directamente desde la
// terminal (no es parte del servidor Express). Útil para crear al
// primer admin, o cualquier empleado nuevo, sin necesitar todavía
// una pantalla de "Agregar empleado" en el frontend.
//
// USO:
//   node scripts/crear-usuario.js "Cesar Perez" cesar micontrasena123 admin
//   node scripts/crear-usuario.js "Ana Lopez" ana claveana456 empleado
//
// Argumentos: nombre  usuario  contrasena  rol(admin|empleado)

import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

import "../api/v1/config/db.js";
import { Usuario } from "../api/v1/models/index.js";

const [, , nombre, usuario, contrasena, rol] = process.argv;

if (!nombre || !usuario || !contrasena) {
  console.error("Uso: node scripts/crear-usuario.js \"Nombre Completo\" usuario contrasena [admin|empleado]");
  process.exit(1);
}

async function crearUsuario() {
  try {
    // bcrypt.hash() convierte la contraseña en texto plano a un hash
    // irreversible. El "10" es el "costo" (rondas de procesamiento) —
    // 10 es un valor estándar recomendado, balancea seguridad y velocidad.
    const password_hash = await bcrypt.hash(contrasena, 10);

    const nuevo = await Usuario.create({
      nombre,
      usuario,
      password_hash,
      rol: rol || "empleado"
    });

    console.log("✅ Usuario creado correctamente:");
    console.log({
      id_usuario: nuevo.id_usuario,
      nombre: nuevo.nombre,
      usuario: nuevo.usuario,
      rol: nuevo.rol
    });
  } catch (err) {
    console.error("✗ Error al crear usuario:", err.message);
  } finally {
    process.exit(0);
  }
}

crearUsuario();
