import jwt from "jsonwebtoken";

/**
 * Protege el acceso a cualquier archivo dentro de /app/ (formulario2.html,
 * form-globos.js, etc.) — es decir, la herramienta interna del negocio.
 *
 * A diferencia de apiGuard (que protege la API), esto protege las
 * PÁGINAS mismas: si alguien intenta abrir directamente
 * https://.../app/formulario2.html sin haber iniciado sesión, se le
 * redirige a /login.html en vez de mostrarle la página.
 *
 * Se ejecuta ANTES de express.static, para que la redirección ocurra
 * antes de que el servidor llegue a entregar el archivo.
 */
export default function requireAppSession(req, res, next) {
  // Solo nos interesa proteger rutas que empiecen con /app
  if (!req.path.startsWith("/app")) return next();

  const token = req.cookies?.token;
  if (!token) {
    return res.redirect("/login.html");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // Token inválido o expirado (ej. pasaron las 6 horas de sesión)
    return res.redirect("/login.html");
  }
}
