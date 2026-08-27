import jwt from "jsonwebtoken";

// Rutas de escritura (POST/PUT/DELETE) que CUALQUIER usuario logueado
// puede usar, sin importar su rol — porque capturar movimientos de
// entrada/salida es trabajo del día a día de cualquier empleado.
// Todo lo demás que no sea GET queda reservado solo para "admin"
// (catálogo: marca, estilo, tamaño, color, globo, ubicación).
const RUTAS_ESCRITURA_EMPLEADO = ["/v1/movimiento"];

// Igual que RUTAS_ESCRITURA_EMPLEADO, pero para rutas que necesitan
// coincidir por patrón (con un id numérico en medio) en vez de un
// prefijo fijo. Ej: /v1/globo/14/foto, /v1/globo/203/foto, etc.
//
// Subir la foto de un producto EXISTENTE se permite a cualquier
// usuario logueado — la regla más fina de "solo admin puede
// reemplazar una foto que ya existe" se valida dentro del controller
// (globo/controller.js → subirFoto), porque ese matiz depende de un
// dato (si ya hay foto o no) que este middleware no conoce.
const REGEX_ESCRITURA_EMPLEADO = [/^\/v1\/globo\/\d+\/foto$/];

/**
 * Middleware central que protege TODA la API bajo /api, con estas reglas:
 *   1. GET siempre es público (lectura de catálogo/inventario libre)
 *   2. /v1/auth/* nunca se bloquea aquí (login/logout tienen su propia lógica)
 *   3. Cualquier otro método (POST/PUT/DELETE) requiere sesión iniciada
 *   4. Dentro de eso, /v1/movimiento y /v1/globo/:id/foto pueden ser
 *      usados por "empleado"; el resto de escrituras requieren rol "admin"
 *
 * Se aplica una sola vez en app.js, en vez de repetir esta lógica en
 * cada uno de los 8 módulos (marca, estilo, tamano, color, globo,
 * ubicacion, movimiento, inventario).
 */
export default function apiGuard(req, res, next) {
  // 1. Lecturas siempre libres
  if (req.method === "GET") return next();

  // 2. El módulo de auth maneja su propia protección (login es público,
  //    /me usa requireAuth directamente en su propio router)
  if (req.path.startsWith("/v1/auth")) return next();

  // 3. A partir de aquí, se requiere sesión válida
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "No has iniciado sesión" });
  }

  let usuario;
  try {
    usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Sesión inválida o expirada, inicia sesión de nuevo" });
  }
  req.usuario = usuario;

  // 4. Reglas de permiso por rol
  const esRutaDeEmpleado =
    RUTAS_ESCRITURA_EMPLEADO.some((ruta) => req.path.startsWith(ruta)) ||
    REGEX_ESCRITURA_EMPLEADO.some((regex) => regex.test(req.path));

  if (esRutaDeEmpleado || usuario.rol === "admin") {
    return next();
  }

  return res.status(403).json({ message: "No tienes permiso para realizar esta acción" });
}

