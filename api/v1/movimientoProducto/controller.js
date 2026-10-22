import { MovimientoProducto, Producto, Ubicacion } from "../models/index.js";

const TIPOS_VALIDOS = ["entrada", "salida"];
const UNIDADES_VALIDAS = ["paquetes", "piezas"];

const controller = {
  /**
   * GET /api/v1/movimiento-producto?id_producto=1&id_ubicacion=2&tipo=entrada&limite=50
   * Historial de movimientos, del más reciente al más antiguo.
   * Por defecto regresa los últimos 100 (máximo 500).
   */
  all: async (req, res, next) => {
    try {
      const { id_producto, id_ubicacion, tipo, limite } = req.query;
      const where = {};
      if (id_producto) where.id_producto = id_producto;
      if (id_ubicacion) where.id_ubicacion = id_ubicacion;
      if (tipo) where.tipo = tipo;

      const tope = Math.min(Math.max(parseInt(limite, 10) || 100, 1), 500);

      const data = await MovimientoProducto.findAll({
        where,
        include: [Producto, Ubicacion],
        order: [["fecha", "DESC"]],
        limit: tope
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/movimiento-producto
   * Body: { id_producto, id_ubicacion, tipo, cantidad, unidad }
   *   tipo   = "entrada" | "salida"
   *   unidad = "paquetes" | "piezas"  (cómo se capturó la cantidad)
   *
   * La conversión a PIEZAS se hace AQUÍ, en el servidor (una sola fuente
   * de verdad): paquetes x piezas_por_paquete del producto, o las piezas
   * tal cual. Ej. 2 paquetes de CD-5 (5 piezas) = 10 piezas.
   * El usuario que captura sale de la sesión, nunca del body.
   */
  create: async (req, res, next) => {
    try {
      const { id_producto, id_ubicacion, tipo, cantidad, unidad } = req.body;

      if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ message: "tipo debe ser 'entrada' o 'salida'" });
      }
      if (!UNIDADES_VALIDAS.includes(unidad)) {
        return res.status(400).json({ message: "unidad debe ser 'paquetes' o 'piezas'" });
      }
      const cant = Number(cantidad);
      if (!Number.isInteger(cant) || cant <= 0) {
        return res.status(400).json({ message: "cantidad debe ser un número entero mayor a 0" });
      }
      if (!id_producto || !id_ubicacion) {
        return res.status(400).json({ message: "id_producto e id_ubicacion son obligatorios" });
      }

      const producto = await Producto.findByPk(id_producto);
      if (!producto || !producto.activo) {
        return res.status(400).json({ message: "El producto no existe o está desactivado" });
      }
      const ubicacion = await Ubicacion.findByPk(id_ubicacion);
      if (!ubicacion) {
        return res.status(400).json({ message: "La ubicación indicada no existe" });
      }

      const piezas = unidad === "paquetes" ? cant * producto.piezas_por_paquete : cant;

      // El payload del JWT puede traer el id como "id_usuario" o como "id":
      // se acepta cualquiera de los dos (si no hay ninguno queda NULL).
      const id_usuario = req.usuario?.id_usuario ?? req.usuario?.id ?? null;

      const nuevo = await MovimientoProducto.create({
        id_producto: producto.id_producto,
        id_ubicacion: ubicacion.id_ubicacion,
        id_usuario,
        tipo,
        piezas
      });
      res.status(201).json(nuevo);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/movimiento-producto/:id   (solo admin, lo valida apiGuard)
   * Para corregir una captura equivocada.
   */
  remove: async (req, res, next) => {
    try {
      const item = await MovimientoProducto.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Movimiento no encontrado" });
      await item.destroy();
      res.json({ message: "Movimiento eliminado", id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
};

export default controller;
