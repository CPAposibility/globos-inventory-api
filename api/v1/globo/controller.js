import { Globo, Marca, Estilo, Tamano, Color } from "../models/index.js";

// Catálogos que se incluyen automáticamente cada vez que se consulta un globo,
// para que la respuesta venga con los datos completos de marca/estilo/tamaño/color
// en lugar de solo los IDs.
const includeCatalogo = [Marca, Estilo, Tamano, Color];

const controller = {
  /**
   * GET /api/v1/globo
   * GET /api/v1/globo?id_marca=1&id_estilo=2&id_tamano=3&id_color=4
   *
   * Lista globos (SKUs). Soporta filtrar por cualquier combinación de
   * id_marca, id_estilo, id_tamano, id_color vía query params.
   *
   * Esto es clave para el formulario: antes de crear un producto nuevo,
   * el frontend pregunta "¿ya existe este SKU exacto?" mandando los 4
   * filtros juntos. Si solo filtráramos por id_marca (como estaba antes),
   * se podían regresar varios globos de la misma marca y el formulario
   * tomaría el primero al azar — pudiendo registrar movimientos contra
   * el producto equivocado.
   */
  all: async (req, res, next) => {
    try {
      const { id_marca, id_estilo, id_tamano, id_color } = req.query;

      // Armamos el objeto "where" solo con los filtros que sí llegaron.
      // Si no llega ninguno, where queda como {} y Sequelize regresa todo.
      const where = {};
      if (id_marca) where.id_marca = id_marca;
      if (id_estilo) where.id_estilo = id_estilo;
      if (id_tamano) where.id_tamano = id_tamano;
      if (id_color) where.id_color = id_color;

      // Ejecutamos la consulta con el filtro armado arriba y traemos
      // también los datos de los catálogos relacionados (marca, estilo, etc).
      const data = await Globo.findAll({ where, include: includeCatalogo });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/globo
   * Body: { id_marca, id_estilo, id_tamano, id_color, codigo_interno, costo_mayoreo, costo_menudeo, costo_caja, costo_media }
   *
   * Crea un nuevo globo (SKU). El formulario llama a este endpoint solo
   * cuando la búsqueda en "all" no encontró un globo existente con esa
   * combinación exacta de marca+estilo+tamaño+color.
   *
   * codigo_interno se incluye porque el frontend lo autogenera
   * (ej. "CIE-RED-09-ROJ") y necesita guardarse junto con el resto.
   */
  create: async (req, res, next) => {
    try {
      const {
        id_marca, id_estilo, id_tamano, id_color, codigo_interno,
        costo_mayoreo, costo_menudeo, costo_caja, costo_media
      } = req.body;

      const nuevo = await Globo.create({
        id_marca, id_estilo, id_tamano, id_color, codigo_interno,
        costo_mayoreo, costo_menudeo, costo_caja, costo_media
      });

      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/globo/:id
   * Devuelve un solo globo por su id_globo, con los catálogos relacionados incluidos.
   */
  read: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id, { include: includeCatalogo });
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/globo/:id
   * Actualiza cualquier campo del globo indicado. No valida qué campos
   * vienen en el body — actualiza todo lo que se le mande.
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      await item.update(req.body);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/globo/:id
   * Elimina el globo indicado. Ojo: si ya tiene movimientos asociados,
   * esto puede fallar por la relación con la tabla movimiento (dependiendo
   * de cómo esté configurada la foreign key / onDelete en el modelo).
   */
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Globo.findByPk(id);
      if (!item) return res.status(404).json({ message: "Globo no encontrado" });
      await item.destroy();
      res.json({ message: "Globo eliminado", id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
