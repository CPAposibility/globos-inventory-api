// scripts/cambiar-password.js
//
// Cambia la contraseña de un usuario ya existente. Útil cuando una
// contraseña quedó expuesta accidentalmente (ej. en una captura de
// pantalla, un chat, un correo) y hay que reemplazarla.
//
// USO:
//   node scripts/cambiar-password.js cesar NuevaContrasenaSegura456

import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

import "../api/v1/config/db.js";
import { Usuario } from "../api/v1/models/index.js";

const [, , usuario, nuevaContrasena] = process.argv;

if (!usuario || !nuevaContrasena) {
  console.error("Uso: node scripts/cambiar-password.js usuario nueva_contrasena");
  process.exit(1);
}

async function cambiarPassword() {
  try {
    const persona = await Usuario.findOne({ where: { usuario } });

    if (!persona) {
      console.error(`✗ No existe el usuario "${usuario}"`);
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(nuevaContrasena, 10);
    await persona.update({ password_hash });

    console.log(`✅ Contraseña actualizada correctamente para "${usuario}"`);
  } catch (err) {
    console.error("✗ Error al cambiar contraseña:", err.message);
  } finally {
    process.exit(0);
  }
}

cambiarPassword();
