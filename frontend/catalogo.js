// frontend/catalogo.js
//
// Llena la cuadricula de productos en la landing pública con datos reales
// del catálogo (marca, estilo, tamaño, color, foto). Usa el endpoint
// GET /api/v1/globo, que es público — no requiere sesión iniciada,
// a diferencia de las escrituras (POST/PUT/DELETE) que sí están
// protegidas por apiGuard en el backend.
//
// Por ahora se muestran TODOS los productos, sin filtrar por los
// chips de categoría (Temática, Clásicos, etc.) — esos siguen siendo
// decorativos hasta que se decida cómo mapearlos a datos reales.

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  if (!grid) return; // por si este script se carga en una página sin la grilla

  // Mismo número que ya se usa en los botones de "Cotizar" del resto
  // de la página — si se actualiza el real más adelante, hay que
  // cambiarlo también aquí.
  const WHATSAPP_NUMERO = '5215500000000';

  try {
    // Se piden en paralelo: el catálogo de productos y el stock actual
    // (vista inventario_actual, ya expuesta en GET /api/v1/inventario).
    // Ambos son endpoints públicos — no requieren sesión.
    const [resProductos, resInventario] = await Promise.all([
      fetch('/api/v1/globo'),
      fetch('/api/v1/inventario')
    ]);

    if (!resProductos.ok) throw new Error('No se pudo cargar el catálogo');

    const productos = await resProductos.json();

    // inventario_actual regresa una fila por cada combinación de
    // producto+ubicación (ej. mismo producto en Almacén, Tienda 1,
    // Tienda 2...). Para saber si un producto está agotado hay que
    // sumar el stock de TODAS sus ubicaciones, no mirar una sola fila.
    const stockPorProducto = {};
    if (resInventario.ok) {
      const filasInventario = await resInventario.json();
      filasInventario.forEach((fila) => {
        const actual = stockPorProducto[fila.id_globo] || 0;
        // parseFloat porque Sequelize/Postgres regresan columnas
        // numéricas de consultas SQL crudas como texto (ej. "12.00"),
        // no como número directo.
        stockPorProducto[fila.id_globo] = actual + parseFloat(fila.stock);
      });
    }
    // Si /api/v1/inventario fallara por algún motivo, seguimos
    // mostrando el catálogo igual (sin marcar nada como agotado) en
    // vez de romper toda la página por un problema secundario.

    if (productos.length === 0) {
      grid.innerHTML = '<p class="product-grid-loading">Muy pronto agregaremos productos aquí.</p>';
      return;
    }

    grid.innerHTML = '';
    productos.forEach((producto) => {
      const stock = stockPorProducto[producto.id_globo] || 0;
      grid.appendChild(crearTarjeta(producto, WHATSAPP_NUMERO, stock));
    });
  } catch (err) {
    console.error('Error al cargar el catálogo:', err);
    grid.innerHTML = '<p class="product-grid-loading">No se pudo cargar el catálogo. Intenta más tarde.</p>';
  }
});

/**
 * Arma una tarjeta de producto a partir de los datos que regresa la API.
 * GET /api/v1/globo incluye los catálogos relacionados (Marca, Estilo,
 * Tamano, Color) directo en cada objeto — ver globo/controller.js →
 * includeCatalogo — así que no hace falta hacer más peticiones.
 *
 * @param {number} stock - suma de existencias en TODAS las ubicaciones
 *   (almacén + las 3 tiendas). Si es 0 o menos, la tarjeta se marca
 *   como "Agotado" pero sigue mostrándose (decisión de Cesar: no se
 *   oculta del catálogo, solo se atenúa visualmente).
 */
function crearTarjeta(producto, whatsappNumero, stock) {
  const marca = producto.Marca ? producto.Marca.nombre : '';
  const estilo = producto.Estilo ? producto.Estilo.estilo : '';
  const tamano = producto.Tamano ? producto.Tamano.tamano : '';
  const color = producto.Color ? producto.Color.color : '';
  const nombre = `${marca} ${estilo} ${tamano ? tamano + '"' : ''} ${color}`.replace(/\s+/g, ' ').trim();

  const agotado = stock <= 0;

  const tarjeta = document.createElement('div');
  tarjeta.className = agotado ? 'product-tile product-tile-agotado' : 'product-tile';

  // Si el producto no tiene foto todavía, se muestra un placeholder
  // genérico con degradado (reutiliza los colores de marca de la
  // página) en vez de dejar un espacio vacío o roto.
  const imagenHtml = producto.foto_url
    ? `<img src="${producto.foto_url}" alt="${nombre}" loading="lazy" />`
    : `<div class="product-tile-placeholder" aria-hidden="true">🎈</div>`;

  const insigniaAgotado = agotado
    ? `<span class="product-tile-badge">Agotado</span>`
    : '';

  const mensajeWhatsapp = encodeURIComponent(`Hola, me interesa cotizar: ${nombre}`);

  tarjeta.innerHTML = `
    <div class="product-tile-image">
      ${imagenHtml}
      ${insigniaAgotado}
    </div>
    <div class="product-tile-body">
      <span class="product-tile-name">${nombre}</span>
      <a
        class="product-tile-cta"
        href="https://wa.me/${whatsappNumero}?text=${mensajeWhatsapp}"
        target="_blank"
        rel="noreferrer"
      >
        Cotizar
      </a>
    </div>
  `;

  return tarjeta;
}
