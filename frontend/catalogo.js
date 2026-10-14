// frontend/catalogo.js
//
// Carga el catálogo público y administra el pedido de cotización del cliente.

const WHATSAPP_NUMERO = '5215500000000';
const CART_STORAGE_KEY = 'el-guateque-cart';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  const quoteButton = document.getElementById('floating-quote');
  const cartCount = document.getElementById('cart-count');
  const imageDialog = document.getElementById('product-image-dialog');
  const largeImage = document.getElementById('product-image-large');
  const imageCaption = document.getElementById('product-image-caption');
  const closeImageButton = document.getElementById('product-image-close');
  if (!grid) return;

  const carrito = cargarCarrito();

  function actualizarCotizacion() {
    const productos = Array.from(carrito.values());
    const cantidad = productos.reduce((total, producto) => total + producto.cantidad, 0);
    const detalle = productos
      .map((producto) => `- ${producto.nombre} (cantidad: ${producto.cantidad})`)
      .join('\n');
    const mensaje = productos.length
      ? `Hola, me gustaría cotizar estos productos:\n${detalle}`
      : 'Hola, me gustaría cotizar un pedido.';

    quoteButton.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    quoteButton.setAttribute(
      'aria-label',
      cantidad ? `Cotizar pedido con ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}` : 'Cotizar pedido'
    );
    cartCount.textContent = cantidad;
  }

  function agregarAlCarrito(id, nombre) {
    const producto = carrito.get(id);
    carrito.set(id, {
      nombre,
      cantidad: producto ? producto.cantidad + 1 : 1
    });
    guardarCarrito(carrito);
    actualizarCotizacion();
  }

  function ampliarImagen(src, nombre) {
    if (!imageDialog || !largeImage) return;
    largeImage.src = src;
    largeImage.alt = nombre;
    imageCaption.textContent = nombre;
    imageDialog.showModal();
  }

  closeImageButton?.addEventListener('click', () => imageDialog.close());
  imageDialog?.addEventListener('click', (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });

  actualizarCotizacion();

  try {
    const [resultadoProductos, resultadoInventario] = await Promise.allSettled([
      fetch('/api/v1/globo'),
      fetch('/api/v1/inventario')
    ]);

    if (resultadoProductos.status === 'rejected') {
      throw new Error(`No se pudo conectar con el catálogo: ${resultadoProductos.reason.message}`);
    }

    const resProductos = resultadoProductos.value;
    if (!resProductos.ok) {
      throw new Error(`El catálogo respondió con error HTTP ${resProductos.status}`);
    }

    const productos = await resProductos.json();
    if (!Array.isArray(productos)) {
      throw new Error('La respuesta del catálogo no tiene el formato esperado');
    }

    const stockPorProducto = {};
    let inventarioDisponible = false;
    if (resultadoInventario.status === 'rejected') {
      console.error('No se pudo cargar el inventario; se mostrarán los productos sin datos de existencias:', resultadoInventario.reason);
    } else if (!resultadoInventario.value.ok) {
      console.error(`El inventario respondió con error HTTP ${resultadoInventario.value.status}; se mostrarán los productos sin datos de existencias.`);
    } else {
      try {
        const filasInventario = await resultadoInventario.value.json();
        if (!Array.isArray(filasInventario)) throw new Error('La respuesta del inventario no tiene el formato esperado');
        inventarioDisponible = true;
        filasInventario.forEach((fila) => {
          const existencia = parseFloat(fila.stock);
          if (!Number.isFinite(existencia)) return;
          const actual = stockPorProducto[fila.id_globo] || 0;
          stockPorProducto[fila.id_globo] = actual + existencia;
        });
      } catch (err) {
        console.error('No se pudo interpretar el inventario; se mostrarán los productos sin datos de existencias:', err);
      }
    }

    if (productos.length === 0) {
      grid.innerHTML = '<p class="product-grid-loading">Muy pronto agregaremos productos aquí.</p>';
      return;
    }

    const productosPorMarca = agruparPorMarca(productos);
    grid.replaceChildren();
    productosPorMarca.forEach(({ nombre, productos: productosMarca }) => {
      const seccionMarca = document.createElement('section');
      seccionMarca.className = 'product-brand-section';

      const tituloMarca = document.createElement('h4');
      tituloMarca.className = 'product-brand-title';
      tituloMarca.textContent = nombre;

      const grillaMarca = document.createElement('div');
      grillaMarca.className = 'brand-product-grid';
      productosMarca.forEach((producto) => {
        const stock = inventarioDisponible ? (stockPorProducto[producto.id_globo] || 0) : null;
        grillaMarca.appendChild(crearTarjeta(producto, stock, agregarAlCarrito, ampliarImagen));
      });

      seccionMarca.append(tituloMarca, grillaMarca);
      grid.appendChild(seccionMarca);
    });
  } catch (err) {
    console.error('Error al cargar el catálogo:', err);
    const mensajeError = document.createElement('p');
    mensajeError.className = 'product-grid-loading';
    mensajeError.textContent = `No se pudo cargar el catálogo. ${err.message}`;
    grid.replaceChildren(mensajeError);
  }
});

function cargarCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(guardado)) throw new Error('El formato del carrito guardado no es válido');

    return new Map(
      guardado
        .filter((producto) =>
          producto &&
          typeof producto.id === 'string' &&
          typeof producto.nombre === 'string' &&
          Number.isInteger(producto.cantidad) &&
          producto.cantidad > 0
        )
        .map((producto) => [producto.id, { nombre: producto.nombre, cantidad: producto.cantidad }])
    );
  } catch (err) {
    console.error('No se pudo recuperar el carrito guardado:', err);
    return new Map();
  }
}

function guardarCarrito(carrito) {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(Array.from(carrito, ([id, producto]) => ({ id, ...producto })))
    );
  } catch (err) {
    console.error('No se pudo guardar el carrito:', err);
  }
}

function agruparPorMarca(productos) {
  const marcas = new Map();

  productos.forEach((producto) => {
    const nombreMarca = producto.Marca?.nombre || 'Otras marcas';
    const claveMarca = esQKing(nombreMarca)
      ? 'qking'
      : normalizarNombreMarca(nombreMarca).replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ');
    if (!marcas.has(claveMarca)) marcas.set(claveMarca, { nombre: nombreMarca, productos: [] });
    marcas.get(claveMarca).productos.push(producto);
  });

  return Array.from(marcas.values(), ({ nombre, productos: productosMarca }) => ({
    nombre,
    productos: productosMarca.sort(compararProductosPorTamano)
  })).sort((marcaA, marcaB) => {
    const prioridadQKing = Number(!esQKing(marcaA.nombre)) - Number(!esQKing(marcaB.nombre));
    return prioridadQKing || marcaA.nombre.localeCompare(marcaB.nombre, 'es', { sensitivity: 'base' });
  });
}

function compararProductosPorTamano(productoA, productoB) {
  const tamanoA = Number(productoA.Tamano?.tamano);
  const tamanoB = Number(productoB.Tamano?.tamano);
  const tieneTamanoA = Number.isFinite(tamanoA);
  const tieneTamanoB = Number.isFinite(tamanoB);

  if (tieneTamanoA !== tieneTamanoB) return tieneTamanoA ? -1 : 1;
  if (tieneTamanoA && tamanoA !== tamanoB) return tamanoA - tamanoB;

  const estiloA = productoA.Estilo?.estilo || '';
  const estiloB = productoB.Estilo?.estilo || '';
  const porEstilo = estiloA.localeCompare(estiloB, 'es', { sensitivity: 'base' });
  if (porEstilo) return porEstilo;

  const colorA = productoA.Color?.color || '';
  const colorB = productoB.Color?.color || '';
  return colorA.localeCompare(colorB, 'es', { sensitivity: 'base' });
}

function esQKing(nombreMarca) {
  return normalizarNombreMarca(nombreMarca)
    .replace(/['’\s]/g, '') === 'qking';
}

function normalizarNombreMarca(nombreMarca) {
  return nombreMarca
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Crea una tarjeta y conecta sus acciones de agregar al pedido y ampliar foto.
 * @param {number|null} stock - Existencias sumadas; null si no se pudo consultar el inventario.
 */
function crearTarjeta(producto, stock, agregarAlCarrito, ampliarImagen) {
  const marca = producto.Marca ? producto.Marca.nombre : '';
  const estilo = producto.Estilo ? producto.Estilo.estilo : '';
  const tamano = producto.Tamano ? producto.Tamano.tamano : '';
  const color = producto.Color ? producto.Color.color : '';
  const nombre = `${marca} ${estilo} ${tamano ? tamano + '"' : ''} ${color}`.replace(/\s+/g, ' ').trim();
  const agotado = stock !== null && stock <= 0;

  const tarjeta = document.createElement('article');
  tarjeta.className = agotado ? 'product-tile product-tile-agotado' : 'product-tile';

  const contenedorImagen = document.createElement('div');
  contenedorImagen.className = 'product-tile-image';
  if (producto.foto_url) {
    const botonImagen = document.createElement('button');
    botonImagen.className = 'product-image-trigger';
    botonImagen.type = 'button';
    botonImagen.setAttribute('aria-label', `Ampliar foto de ${nombre}`);

    const imagen = document.createElement('img');
    imagen.src = producto.foto_url;
    imagen.alt = nombre;
    imagen.loading = 'lazy';
    botonImagen.appendChild(imagen);
    const indicadorZoom = document.createElement('span');
    indicadorZoom.className = 'product-image-zoom';
    indicadorZoom.setAttribute('aria-hidden', 'true');
    indicadorZoom.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 5 5M10.8 7.8v6M7.8 10.8h6" />
      </svg>
    `;
    botonImagen.appendChild(indicadorZoom);
    botonImagen.addEventListener('click', () => ampliarImagen(producto.foto_url, nombre));
    contenedorImagen.appendChild(botonImagen);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'product-tile-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = '🎈';
    contenedorImagen.appendChild(placeholder);
  }

  if (agotado) {
    const insignia = document.createElement('span');
    insignia.className = 'product-tile-badge';
    insignia.textContent = 'Agotado';
    contenedorImagen.appendChild(insignia);
  }

  const cuerpo = document.createElement('div');
  cuerpo.className = 'product-tile-body';

  const nombreProducto = document.createElement('span');
  nombreProducto.className = 'product-tile-name';
  nombreProducto.textContent = nombre;

  const botonAgregar = document.createElement('button');
  botonAgregar.className = 'product-tile-cta';
  botonAgregar.type = 'button';
  botonAgregar.setAttribute('aria-label', `Agregar ${nombre} al pedido`);
  botonAgregar.title = 'Agregar al pedido';
  botonAgregar.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M13 5v6M10 8h6" />
    </svg>
    <span>Agregar</span>
  `;
  botonAgregar.addEventListener('click', () => agregarAlCarrito(String(producto.id_globo), nombre));

  cuerpo.append(nombreProducto, botonAgregar);
  tarjeta.append(contenedorImagen, cuerpo);
  return tarjeta;
}
