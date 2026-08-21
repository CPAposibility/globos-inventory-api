import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";

// Duración de la sesión: 6 horas. Después de eso, el JWT expira
// y el usuario tiene que volver a loguearse (decisión del negocio:
// prefieren volver a loguearse cada día en vez de sesiones largas).
const DURACION_SESION = "6h";

const controller = {
  /**
   * POST /api/v1/auth/login
   * Body: { usuario, password }
   *
   * Verifica las credenciales y, si son correctas, genera un JWT
   * (token de sesión) y lo guarda en una cookie httpOnly — es decir,
   * una cookie que JavaScript en el navegador NO puede leer ni robar
   * (protección contra ataques XSS). El navegador la manda automática
   * en cada request futuro, sin que el frontend tenga que manejarla.
   */
  login: async (req, res, next) => {
    try {
      const { usuario, password } = req.body;

      if (!usuario || !password) {
        return res.status(400).json({ message: "Usuario y contraseña son obligatorios" });
      }

      // Buscamos al usuario por su nombre de login (no por id_usuario)
      const persona = await Usuario.findOne({ where: { usuario } });

      // Mensaje genérico a propósito: no decimos si falló porque el
      // usuario no existe o porque la contraseña está mal. Si fuéramos
      // más específicos, alguien podría usar esa diferencia para
      // averiguar qué nombres de usuario existen en el sistema.
      if (!persona) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      if (!persona.activo) {
        return res.status(403).json({ message: "Este usuario está desactivado" });
      }

      // bcrypt.compare re-hashea la contraseña que llegó y compara
      // contra el hash guardado — nunca se "desencripta" el hash
      // original, bcrypt no funciona así (es de una sola vía).
      const passwordValida = await bcrypt.compare(password, persona.password_hash);
      if (!passwordValida) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      // El "payload" del token: información que va firmada y viajará
      // en cada request futura. No incluye la contraseña ni el hash,
      // solo lo necesario para identificar quién es y qué puede hacer.
      const payload = {
        id_usuario: persona.id_usuario,
        usuario: persona.usuario,
        nombre: persona.nombre,
        rol: persona.rol,
        id_ubicacion: persona.id_ubicacion
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: DURACION_SESION
      });

      // Guardamos el token en una cookie, no en el body de la respuesta.
      res.cookie("token", token, {
        httpOnly: true,   // JavaScript del navegador no puede leerla (anti-XSS)
        secure: true,     // solo se manda por HTTPS (Azure ya sirve todo por https)
        sameSite: "strict", // el navegador no la manda en requests desde otros sitios (anti-CSRF)
        maxAge: 6 * 60 * 60 * 1000 // 6 horas en milisegundos
      });

      // Regresamos los datos básicos de la persona (sin password_hash)
      // para que el frontend pueda mostrar "Bienvenido, Cesar" etc.
      res.json({
        id_usuario: persona.id_usuario,
        usuario: persona.usuario,
        nombre: persona.nombre,
        rol: persona.rol
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/auth/logout
   * Borra la cookie de sesión. No requiere verificar nada — si ya no
   * había sesión, simplemente no hace nada dañino.
   */
  logout: async (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Sesión cerrada" });
  },

  /**
   * GET /api/v1/auth/me
   * Le permite al frontend preguntar "¿tengo sesión activa, y quién soy?"
   * al cargar cualquier página — así se puede redirigir a login.html
   * automáticamente si no hay sesión válida.
   * Depende del middleware requireAuth, que ya deja la info en req.usuario.
   */
  me: async (req, res) => {
    res.json(req.usuario);
  }
};

export default controller;
