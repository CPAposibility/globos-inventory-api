// -------------------------------------------------------------
//  Archivo: index.js
//  Ubicación: server/api/v1/models/index.js
//  Función: Registrar las relaciones (FKs) entre modelos
//  IMPORTANTE: se debe importar una sola vez al arrancar el server
// -------------------------------------------------------------
import Marca from "./marca.js";
import Estilo from "./estilo.js";
import Tamano from "./tamano.js";
import Color from "./color.js";
import Globo from "./globo.js";
import Ubicacion from "./ubicacion.js";
import Movimiento from "./movimiento.js";

// Color pertenece a Marca (los colores varían según la marca)
Marca.hasMany(Color, { foreignKey: "id_marca" });
Color.belongsTo(Marca, { foreignKey: "id_marca" });

// Globo (catálogo) pertenece a Marca, Estilo, Tamano, Color
Marca.hasMany(Globo, { foreignKey: "id_marca" });
Globo.belongsTo(Marca, { foreignKey: "id_marca" });

Estilo.hasMany(Globo, { foreignKey: "id_estilo" });
Globo.belongsTo(Estilo, { foreignKey: "id_estilo" });

Tamano.hasMany(Globo, { foreignKey: "id_tamano" });
Globo.belongsTo(Tamano, { foreignKey: "id_tamano" });

Color.hasMany(Globo, { foreignKey: "id_color" });
Globo.belongsTo(Color, { foreignKey: "id_color" });

// Movimiento pertenece a Globo y a Ubicacion
Globo.hasMany(Movimiento, { foreignKey: "id_globo" });
Movimiento.belongsTo(Globo, { foreignKey: "id_globo" });

Ubicacion.hasMany(Movimiento, { foreignKey: "id_ubicacion" });
Movimiento.belongsTo(Ubicacion, { foreignKey: "id_ubicacion" });

export { Marca, Estilo, Tamano, Color, Globo, Ubicacion, Movimiento };
