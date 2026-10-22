// frontend/catalogo.js
//
// Carga el catálogo público y administra el pedido de cotización del cliente.

const WHATSAPP_NUMERO = '5215500000000';
const CART_STORAGE_KEY = 'el-guateque-cart';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  const quoteButton = document.getElementById('floating-quote');
  const cartCount = document.getElementById('cart-count');
  const cartToggle = document.getElementById('cart-toggle');
  const cartPanel = document.getElementById('cart-panel');
  const cartClose = document.getElementById('cart-close');
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartQuote = document.getElementById('cart-quote');
  const imageDialog = document.getElementById('product-image-dialog');
  const largeImage = document.getElementById('product-image-large');
  const imageCaption = document.getElementById('product-image-caption');
  const closeImageButton = document.getElementById('product-image-close');
  const featuredImageTrigger = document.getElementById('featured-image-trigger');
  const featuredCard = document.querySelector('.product-card');
  const featuredCardInner = document.getElementById('batukada-card-inner');
  const featuredCardFront = document.getElementById('batukada-card-front');
  const featuredCardBack = document.getElementById('batukada-card-back');
  const featuredCardDetailsLabel = document.getElementById('batukada-details-label');
  const featuredCardDetailsTitle = document.getElementById('batukada-details-title');
  const featuredCardDetailsList = document.getElementById('batukada-details-list');
  if (!grid) return;

  const carrito = cargarCarrito();

  function actualizarCotizacion() {
    const productos = Array.from(carrito, ([id, producto]) => ({ id, ...producto }));
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
    cartToggle.setAttribute(
      'aria-label',
      cantidad ? `Ver lista de artículos, ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}` : 'Ver lista de artículos vacía'
    );
    cartQuote.href = quoteButton.href;
    actualizarControlesCantidad();
    renderizarListaCarrito(productos);
  }

  function actualizarCantidad(id, nombre, cambio) {
    const controlActivo = document.activeElement?.closest('.quantity-control');
    const contextoActivo = controlActivo?.closest('.floating-cart-item') ? 'lista' : 'catalogo';
    const accionActiva = document.activeElement?.dataset.action;
    const producto = carrito.get(id);
    const cantidad = (producto?.cantidad || 0) + cambio;
    if (cantidad <= 0) {
      carrito.delete(id);
    } else {
      carrito.set(id, { nombre, cantidad });
    }
    guardarCarrito(carrito);
    actualizarCotizacion();

    if (controlActivo && accionActiva) {
      const controles = Array.from(document.querySelectorAll('.quantity-control'))
        .filter((control) => control.dataset.productId === id);
      const controlDestino =
        controles.find((control) => Boolean(control.closest('.floating-cart-item')) === (contextoActivo === 'lista')) ||
        controles[0];
      controlDestino?.querySelector(`[data-action="${accionActiva}"]`)?.focus();
    }
  }

  function crearControlCantidad(id, nombre) {
    const control = document.createElement('div');
    control.className = 'quantity-control';
    control.dataset.productId = id;

    const botonMenos = document.createElement('button');
    botonMenos.className = 'quantity-control-button';
    botonMenos.type = 'button';
    botonMenos.dataset.action = 'remove';
    botonMenos.setAttribute('aria-label', `Quitar una unidad de ${nombre}`);
    botonMenos.textContent = '-';
    botonMenos.addEventListener('click', () => actualizarCantidad(id, nombre, -1));

    const cantidad = document.createElement('span');
    cantidad.className = 'quantity-control-value';
    cantidad.textContent = carrito.get(id)?.cantidad || 'Agregar';

    const botonMas = document.createElement('button');
    botonMas.className = 'quantity-control-button';
    botonMas.type = 'button';
    botonMas.dataset.action = 'add';
    botonMas.setAttribute('aria-label', `Agregar ${nombre} al pedido`);
    botonMas.textContent = '+';
    botonMas.addEventListener('click', () => actualizarCantidad(id, nombre, 1));

    control.append(botonMenos, cantidad, botonMas);
    botonMenos.disabled = !carrito.has(id);
    return control;
  }

  function actualizarControlesCantidad() {
    document.querySelectorAll('.quantity-control').forEach((control) => {
      const producto = carrito.get(control.dataset.productId);
      const cantidad = producto?.cantidad || 0;
      const textoCantidad = control.querySelector('.quantity-control-value');
      const botonMenos = control.querySelector('[data-action="remove"]');
      textoCantidad.textContent = cantidad || 'Agregar';
      botonMenos.disabled = cantidad === 0;
      botonMenos.setAttribute(
        'aria-label',
        cantidad ? `Quitar una unidad de ${producto.nombre}` : 'No hay unidades para quitar'
      );
    });
  }

  function renderizarListaCarrito(productos) {
    cartItems.replaceChildren();
    cartEmpty.hidden = productos.length > 0;
    cartQuote.setAttribute('aria-label', productos.length ? 'Cotizar artículos de la lista por WhatsApp' : 'Cotizar pedido por WhatsApp');

    productos.forEach((producto) => {
      const elemento = document.createElement('li');
      elemento.className = 'floating-cart-item';

      const nombre = document.createElement('span');
      nombre.className = 'floating-cart-item-name';
      nombre.textContent = producto.nombre;

      elemento.append(nombre, crearControlCantidad(producto.id, producto.nombre));
      cartItems.appendChild(elemento);
    });
  }

  function alternarListaCarrito(abierta) {
    cartPanel.hidden = !abierta;
    cartToggle.setAttribute('aria-expanded', String(abierta));
    if (abierta) cartClose.focus();
  }

  cartToggle.addEventListener('click', () => alternarListaCarrito(cartPanel.hidden));
  cartClose.addEventListener('click', () => {
    alternarListaCarrito(false);
    cartToggle.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cartPanel.hidden) {
      alternarListaCarrito(false);
      cartToggle.focus();
    }
  });
  // Cierra la lista al tocar fuera del área flotante (botones + panel).
  // Se usa event.composedPath() en lugar de event.target.closest(...) porque
  // al tocar "+" o "-" dentro de la lista, la lista se vuelve a dibujar y el
  // botón tocado ya no está en la página cuando este listener se ejecuta:
  // closest() no encontraba su contenedor y cerraba la lista por error.
  // composedPath() se calcula al momento del clic, antes de que cambie el DOM.
  const areaFlotante = cartPanel.closest('.floating-actions');
  document.addEventListener('click', (event) => {
    if (!cartPanel.hidden && !event.composedPath().includes(areaFlotante)) {
      alternarListaCarrito(false);
    }
  });

  function ampliarImagen(src, nombre, titulo = nombre) {
    if (!imageDialog || !largeImage) return;
    largeImage.src = src;
    largeImage.alt = nombre;
    imageCaption.textContent = titulo;
    imageCaption.hidden = !titulo;
    imageDialog.showModal();
  }

  featuredImageTrigger?.addEventListener('click', () => {
    const image = featuredImageTrigger.querySelector('img');
    if (image) ampliarImagen(image.currentSrc || image.src, 'Arreglo de globos Batukada', '');
  });

  const contenidoBatukada = {
    principal: {
      etiqueta: 'Contenido del paquete',
      titulo: 'Para celebrar en grande',
      productos: [
        '6 máscaras de neón',
        '6 collares hawaianos',
        '6 corbatas',
        '6 moños',
        '6 antifaces de neón',
        '6 antifaces de lente, bigote y nariz',
        '6 coronas',
        '6 bombines',
        '6 diademas de lluvia',
        '5 mechones',
        '2 letreros'
      ]
    },
    mini: {
      etiqueta: 'Contenido de Mini Batukada',
      titulo: 'Para 30 personas',
      productos: [
        '4 máscaras de neón',
        '4 collares hawaianos',
        '4 corbatas',
        '4 moños',
        '4 antifaces de neón',
        '4 antifaces de lente, bigote y nariz',
        '4 coronas',
        '4 bombines',
        '4 diademas de lluvia',
        '4 espantasuegras',
        '2 mechudos',
        '2 letreros'
      ]
    }
  };
  let tipoPaqueteBatukada = 'principal';

  function voltearTarjetaBatukada(mostrarDetalles, devolverFoco = false, tipoPaquete = 'principal') {
    if (
      !featuredCard ||
      !featuredCardInner ||
      !featuredCardFront ||
      !featuredCardBack ||
      !featuredCardDetailsLabel ||
      !featuredCardDetailsTitle ||
      !featuredCardDetailsList
    ) return;

    const tipoPaqueteAnterior = tipoPaqueteBatukada;
    featuredCard.classList.toggle('is-flipped', mostrarDetalles);
    featuredCardFront.inert = mostrarDetalles;
    featuredCardFront.setAttribute('aria-hidden', String(mostrarDetalles));
    featuredCardBack.inert = !mostrarDetalles;
    featuredCardBack.setAttribute('aria-hidden', String(!mostrarDetalles));
    tipoPaqueteBatukada = mostrarDetalles ? tipoPaquete : 'principal';
    const contenido = contenidoBatukada[tipoPaqueteBatukada];
    featuredCardDetailsLabel.textContent = contenido.etiqueta;
    featuredCardDetailsTitle.textContent = contenido.titulo;
    featuredCardDetailsList.replaceChildren(
      ...contenido.productos.map((producto) => {
        const item = document.createElement('li');
        item.textContent = producto;
        return item;
      })
    );
    featuredCard.querySelectorAll('.card-flip-toggle, .mini-option-details').forEach((button) => {
      button.setAttribute('aria-expanded', String(mostrarDetalles && tipoPaqueteBatukada === 'mini'));
    });
    featuredCard.querySelector('#batukada-card-front .card-flip-toggle')?.setAttribute(
      'aria-expanded',
      String(mostrarDetalles && tipoPaqueteBatukada === 'principal')
    );
    featuredCardInner.style.height = `${(mostrarDetalles ? featuredCardBack : featuredCardFront).offsetHeight}px`;

    if (devolverFoco) {
      if (mostrarDetalles) {
        featuredCard.querySelector('#batukada-card-back .card-flip-toggle')?.focus();
      } else if (tipoPaqueteAnterior === 'mini') {
        featuredCard.querySelector('.mini-option-details')?.focus();
      } else {
        featuredCard.querySelector('#batukada-card-front .card-flip-toggle')?.focus();
      }
    }
  }

  voltearTarjetaBatukada(false);
  window.addEventListener('resize', () => {
    if (featuredCard?.classList.contains('is-flipped')) {
      voltearTarjetaBatukada(true);
    } else {
      voltearTarjetaBatukada(false);
    }
  });

  featuredCard?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('a, button, input, select, textarea, summary, [contenteditable="true"]')) {
      return;
    }

    voltearTarjetaBatukada(!featuredCard.classList.contains('is-flipped'));
  });
  featuredCard?.querySelectorAll('.card-flip-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const mostrarDetalles = !featuredCard.classList.contains('is-flipped');
      voltearTarjetaBatukada(
        mostrarDetalles,
        true,
        mostrarDetalles ? 'principal' : tipoPaqueteBatukada
      );
    });
  });
  featuredCard?.querySelector('.mini-option-details')?.addEventListener('click', () => {
    voltearTarjetaBatukada(true, true, 'mini');
  });
  featuredCard?.querySelector('.mini-option')?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('button')) return;
    event.stopPropagation();
    voltearTarjetaBatukada(true, false, 'mini');
  });
  featuredCard?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (!(event.target instanceof Element) || event.target.closest('a, button, input, select, textarea, summary, [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      voltearTarjetaBatukada(!featuredCard.classList.contains('is-flipped'), false);
    }
  });

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
        grillaMarca.appendChild(crearTarjeta(producto, stock, crearControlCantidad, ampliarImagen));
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
function crearTarjeta(producto, stock, crearControlCantidad, ampliarImagen) {
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

  const controlCantidad = crearControlCantidad(String(producto.id_globo), nombre);

  cuerpo.append(nombreProducto, controlCantidad);
  tarjeta.append(contenedorImagen, cuerpo);
  return tarjeta;
}
