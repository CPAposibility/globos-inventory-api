import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Representa a cada persona que puede iniciar sesión en la
// herramienta interna (dueño, gerentes, empleados de tienda).
const Usuario = sequelize.define("Usuario", {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  // Nombre de usuario para iniciar sesión (ej. "cesar", "tienda1_ana").
  // Debe ser único — dos personas no pueden compartir el mismo login.
  usuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },

  // NUNCA se guarda la contraseña real, solo su hash generado con
  // bcrypt. bcrypt siempre produce cadenas de exactamente 60
  // caracteres, por eso el límite en la base de datos.
  password_hash: {
    type: DataTypes.STRING(60),
    allowNull: false
  },

  // "admin": acceso completo (dueño/gerentes)
  // "empleado": acceso limitado a captura de movimientos
  // Se puede ampliar más adelante con más roles si hace falta.
  rol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "empleado",
    validate: { isIn: [["admin", "empleado"]] }
  },

  // Opcional: a qué tienda/almacén pertenece este usuario. Por ahora
  // no se usa para restringir nada automáticamente, pero deja lista
  // la base para el día que se quiera limitar cada empleado a
  // capturar movimientos solo de su propia ubicación.
  id_ubicacion: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // Permite "desactivar" a alguien (ej. dejó de trabajar contigo)
  // sin borrar su historial de movimientos capturados.
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: "usuario",
  timestamps: false
});

export default Usuario;
