import jwt from "jsonwebtoken";

/**
 * Middleware que protege rutas que requieren sesión iniciada.
 *
 * Lee el JWT de la cookie "token" (la misma que puso auth/controller.js
 * al hacer login), lo verifica con la misma clave secreta con la que
 * se firmó, y si es válido, deja la información del usuario disponible
 * en req.usuario para que el resto de la ruta la use.
 *
 * Si no hay cookie, o el token es inválido/expiró, corta la petición
 * con 401 antes de que llegue al controller real — así ningún endpoint
 * protegido necesita repetir esta lógica.
 */
export default function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "No has iniciado sesión" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // disponible en cualquier controller de aquí en adelante
    next();
  } catch (err) {
    // jwt.verify lanza error si el token expiró o fue alterado/falsificado
    return res.status(401).json({ message: "Sesión inválida o expirada, inicia sesión de nuevo" });
  }
}
