import { Producto, Seccion, Grupo } from "../models/index.js";
import { subirImagenBlob } from "../config/blobStorage.js";

// Prefijo del código interno según la sección (ej. BAT-CORONA, CD5-SNOOPY).
const PREFIJOS_CODIGO = {
  globos: "GLO", personajes: "PER", arcos: "ARC",
  batukada: "BAT", luz: "LUZ", cd5: "CD5"
};

// Convierte un nombre en un trozo de código: sin acentos, solo A-Z/0-9,
// máximo 8 caracteres. "Feliz cumpleaños" -> "FELIZCUM".
function trozoDeCodigo(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

// Genera un código interno que no exista todavía. Si "BAT-CORONA" ya
// está ocupado, prueba "BAT-CORONA2", "BAT-CORONA3"...
async function generarCodigoUnico(clave, nombre) {
  const prefijo = PREFIJOS_CODIGO[clave] || String(clave).toUpperCase().slice(0, 3);
  const base = `${prefijo}-${trozoDeCodigo(nombre) || "PROD"}`;
  let codigo = base;
  let n = 2;
  while (await Producto.findOne({ where: { codigo_interno: codigo } })) {
    codigo = `${base}${n}`;
    n += 1;
  }
  return codigo;
}

// Catálogos que se incluyen al consultar un producto: su sección y su grupo.
const includeCatalogo = [
  { model: Seccion, attributes: ["id_seccion", "clave", "nombre"] },
  { model: Grupo, attributes: ["id_grupo", "nombre"], required: false }
];

const controller = {
  /**
   * GET /api/v1/producto?clave=batukada
   * Filtros opcionales: clave (de la sección), id_seccion, id_grupo.
   * Por defecto solo regresa productos activos; con ?todos=1 regresa también los inactivos.
   * Es público (GET), igual que el catálogo de globos.
   */
  all: async (req, res, next) => {
    try {
      const { clave, id_seccion, id_grupo, todos } = req.query;
      const where = {};
      if (id_seccion) where.id_seccion = id_seccion;
      if (id_grupo) where.id_grupo = id_grupo;
      if (todos !== "1") where.activo = true;

      // Si llega "clave", la unión con seccion se vuelve obligatoria (INNER JOIN).
      const include = [
        { ...includeCatalogo[0], ...(clave ? { where: { clave } } : {}) },
        includeCatalogo[1]
      ];

      const data = await Producto.findAll({ where, include, order: [["nombre", "ASC"]] });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/producto   (solo admin, lo valida apiGuard)
   * Body: { clave | id_seccion, id_grupo?, nombre, piezas_por_paquete? }
   * Crea un producto nuevo. El código interno se genera solo.
   * Los empleados NO pueden crear productos (igual que con los globos).
   */
  create: async (req, res, next) => {
    try {
      const { id_seccion, clave, id_grupo, nombre, piezas_por_paquete } = req.body;

      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ message: "El nombre del producto es obligatorio" });
      }

      const seccion = id_seccion
        ? await Seccion.findByPk(id_seccion)
        : await Seccion.findOne({ where: { clave } });
      if (!seccion) return res.status(400).json({ message: "La sección indicada no existe" });

      // Si se indica un grupo, debe pertenecer a la MISMA sección.
      let grupoFinal = null;
      if (id_grupo) {
        const grupo = await Grupo.findByPk(id_grupo);
        if (!grupo || grupo.id_seccion !== seccion.id_seccion) {
          return res.status(400).json({ message: "El grupo no existe o no pertenece a esta sección" });
        }
        grupoFinal = grupo.id_grupo;
      }

      const piezas = piezas_por_paquete === undefined ? 12 : Number(piezas_por_paquete);
      if (!Number.isInteger(piezas) || piezas <= 0) {
        return res.status(400).json({ message: "piezas_por_paquete debe ser un entero mayor a 0" });
      }

      const nuevo = await Producto.create({
        id_seccion: seccion.id_seccion,
        id_grupo: grupoFinal,
        nombre: String(nombre).trim(),
        codigo_interno: await generarCodigoUnico(seccion.clave, nombre),
        piezas_por_paquete: piezas
      });
      res.status(201).json(nuevo);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ message: "Ya existe un producto con ese nombre en esta sección" });
      }
      next(err);
    }
  },

  /** GET /api/v1/producto/:id — un solo producto con su sección y grupo. */
  read: async (req, res, next) => {
    try {
      const item = await Producto.findByPk(req.params.id, { include: includeCatalogo });
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/producto/:id   (solo admin)
   * Solo se aceptan estos campos (lista blanca); cualquier otro se ignora.
   * Sirve para renombrar, mover de grupo, desactivar o quitar la foto (foto_url: null).
   */
  update: async (req, res, next) => {
    try {
      const item = await Producto.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });

      const CAMPOS_EDITABLES = ["nombre", "id_grupo", "piezas_por_paquete", "activo", "foto_url"];
      const cambios = {};
      for (const campo of CAMPOS_EDITABLES) {
        if (campo in req.body) cambios[campo] = req.body[campo];
      }
      await item.update(cambios);
      res.json(item);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ message: "Ya existe un producto con ese nombre en esta sección" });
      }
      next(err);
    }
  },

  /**
   * DELETE /api/v1/producto/:id   (solo admin)
   * Un producto con movimientos no se puede borrar (la llave foránea lo
   * impide): en ese caso conviene desactivarlo con PUT { activo: false }.
   */
  remove: async (req, res, next) => {
    try {
      const item = await Producto.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });
      await item.destroy();
      res.json({ message: "Producto eliminado", id: req.params.id });
    } catch (err) {
      if (err.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          message: "Este producto ya tiene movimientos y no se puede borrar. Desactívalo en su lugar."
        });
      }
      next(err);
    }
  },

  /**
   * POST /api/v1/producto/:id/foto
   * Recibe una imagen (campo "foto" en form-data) y la sube a Azure Blob Storage.
   * Misma regla que en los globos:
   *   - Si el producto NO tiene foto, cualquier usuario logueado puede subirla.
   *   - Si YA tiene foto, solo "admin" puede reemplazarla.
   * req.usuario ya viene puesto por apiGuard.
   */
  subirFoto: async (req, res, next) => {
    try {
      const item = await Producto.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });

      if (item.foto_url && req.usuario.rol !== "admin") {
        return res.status(403).json({
          message: "Este producto ya tiene una foto. Solo un administrador puede reemplazarla."
        });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió ningún archivo (campo 'foto')" });
      }

      const foto_url = await subirImagenBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      await item.update({ foto_url });
      res.json(item);
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
