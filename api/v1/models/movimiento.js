import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Movimiento = sequelize.define("Movimiento", {
  id_movimiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_globo: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_ubicacion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // Quién capturó este movimiento. Se llena automáticamente en el
  // backend a partir de la sesión del usuario logueado (nunca se
  // confía en un valor que mande el frontend directamente, para que
  // nadie pueda registrar un movimiento "a nombre de otra persona").
  // Permite NULL porque los movimientos de prueba creados antes del
  // sistema de login no tienen usuario asociado.
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  tipo_movimiento: {
    type: DataTypes.STRING(10),
                                    allowNull: false,
                                    validate: { isIn: [["entrada", "salida"]] }
  },

  // Cantidad representa el número de CAJAS (no globos individuales sueltos).
  // Cada caja completa contiene 100 bolsas, cada media caja contiene 50.
  // No existen fracciones de globo: la unidad más pequeña que se puede
  // recibir o mover es media caja (0.5). Por eso cantidad solo puede ser
  // un múltiplo de 0.5: 0.5, 1, 1.5, 2, 2.5, etc. — nunca algo como 0.3 o 1.7.
  //
  // Se cambió de INTEGER a DECIMAL(5,2) para poder guardar medias cajas:
  //   - 5 dígitos totales, 2 decimales (soporta hasta 999.99 cajas,
  //     de sobra para cualquier movimiento real del negocio)
  cantidad: {
    type: DataTypes.DECIMAL(5, 2),
                                    allowNull: false,
                                    validate: {
                                      min: 0.5,
                                      // Validación personalizada: rechaza cualquier valor que no sea
                                      // múltiplo de 0.5 (ej. 0.3, 1.2, 2.7 quedan bloqueados aquí).
                                      // Multiplicamos por 2 y verificamos que el resultado sea un entero:
                                      // 0.5*2=1 ✓, 1*2=2 ✓, 1.3*2=2.6 ✗ (no es entero, se rechaza)
                                      esMultiploDeMediaCaja(value) {
                                        const doble = parseFloat(value) * 2;
                                        if (!Number.isInteger(doble)) {
                                          throw new Error("La cantidad debe ser en unidades de media caja (0.5, 1, 1.5, 2...)");
                                        }
                                      }
                                    }
  },

  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  nota: DataTypes.STRING(200)
}, {
  tableName: "movimiento",
  timestamps: false
});

export default Movimiento;
