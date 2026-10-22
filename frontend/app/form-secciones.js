/**
 * form-secciones.js — barra de secciones y formularios de Batukada y CD-5
 * (se carga en formulario2.html DESPUÉS de session.js, config.js y form-globos.js)
 *
 * Qué hace:
 *  1. Barra fija de secciones: al tocar una pestaña muestra el panel de esa
 *     sección y oculta los demás. La sección abierta queda en la URL
 *     (#batukada), así que al recargar la página regresa a la misma.
 *  2. Dibuja el formulario de Batukada y el de CD-5 la primera vez que se
 *     abren. Cada sección tiene su PROPIO formulario, con sus propios campos.
 *  3. Cada formulario permite: elegir producto, ubicación, entrada/salida,
 *     cantidad (en paquetes o en piezas sueltas) y foto (cámara o galería).
 *
 * El formulario de Globos (form-globos.js) NO se toca: este archivo es
 * independiente y todo vive dentro de una función para no chocar con él.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Configuración de cada sección que tiene formulario
  //   usaGrupos        -> true: se elige primero un grupo (CD-5: Personajes, Eventos...)
  //   piezasPorPaquete -> se usa al crear productos nuevos desde la app
  //   etiqueta         -> cómo se llama cada elemento en esa sección
  // ---------------------------------------------------------------
  const SECCIONES = {
    batukada: {
      titulo: 'Batukada',
      usaGrupos: false,
      piezasPorPaquete: 12,
      etiqueta: 'Producto',
      placeholder: 'Selecciona producto',
      textoNuevo: '+ Nuevo producto'
    },
    cd5: {
      titulo: 'CD-5',
      usaGrupos: true,
      piezasPorPaquete: 5,
      etiqueta: 'Tema',
      placeholder: 'Selecciona tema',
      textoNuevo: '+ Nuevo tema'
    }
  };

  // ---------------------------------------------------------------
  // Rol del usuario (para mostrar los botones "+ Nuevo ..." solo a admin)
  // session.js avisa con el evento "sesion-lista" cuando sabe quién es.
  // La protección REAL está en el backend (apiGuard): esto es solo cosmético.
  // ---------------------------------------------------------------
  let esAdmin = false;
  const botonesNuevo = []; // se guardan para mostrarlos/ocultarlos cuando llegue la sesión

  document.addEventListener('sesion-lista', function (evt) {
    esAdmin = !!(evt.detail && evt.detail.rol === 'admin');
    botonesNuevo.forEach(function (btn) {
      btn.style.display = esAdmin ? 'inline-block' : 'none';
    });
  });

  // ---------------------------------------------------------------
  // Utilidades compartidas
  // ---------------------------------------------------------------

  // fetch que lanza un Error con el mensaje del servidor si la respuesta no es 2xx
  async function api(url, opciones) {
    const res = await fetch(url, opciones);
    if (!res.ok) {
      const cuerpo = await res.json().catch(function () { return {}; });
      const error = new Error(cuerpo.message || ('Error ' + res.status + ' en ' + url));
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  // Aviso flotante. Usa el mismo elemento (#toast-message) que form-globos.js
  function mostrarAviso(mensaje, ms) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-message';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, ms || 3000);
  }

  // Orden alfabético en español (ignora mayúsculas y acentos)
  function ordenarPorNombre(lista) {
    return lista.slice().sort(function (a, b) {
      return String(a.nombre).localeCompare(String(b.nombre), 'es', { sensitivity: 'base' });
    });
  }

  // Llena un <select>. Usa textContent (no innerHTML) para que un nombre
  // con caracteres raros nunca se interprete como HTML.
  function llenarSelect(select, items, valueKey, textKey, placeholder) {
    select.innerHTML = '';
    const vacio = document.createElement('option');
    vacio.value = '';
    vacio.textContent = placeholder;
    select.appendChild(vacio);
    items.forEach(function (item) {
      const op = document.createElement('option');
      op.value = item[valueKey];
      op.textContent = item[textKey];
      select.appendChild(op);
    });
  }

  // ---------------------------------------------------------------
  // Fotos: compresión (igual que en Globos: máx. 1600 px, JPEG)
  // ---------------------------------------------------------------
  const FOTO_MAX_DIMENSION = 1600;
  const FOTO_CALIDAD = 0.82;

  function comprimirImagen(archivo) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      const url = URL.createObjectURL(archivo);
      img.onload = function () {
        URL.revokeObjectURL(url);
        let ancho = img.width;
        let alto = img.height;
        if (ancho > FOTO_MAX_DIMENSION || alto > FOTO_MAX_DIMENSION) {
          if (ancho > alto) {
            alto = Math.round(alto * (FOTO_MAX_DIMENSION / ancho));
            ancho = FOTO_MAX_DIMENSION;
          } else {
            ancho = Math.round(ancho * (FOTO_MAX_DIMENSION / alto));
            alto = FOTO_MAX_DIMENSION;
          }
        }
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        lienzo.getContext('2d').drawImage(img, 0, 0, ancho, alto);
        lienzo.toBlob(function (blob) {
          if (!blob) { reject(new Error('No se pudo procesar la imagen')); return; }
          resolve(blob);
        }, 'image/jpeg', FOTO_CALIDAD);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen'));
      };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------
  // Cámara: una sola ventana (overlay) compartida por todos los formularios.
  // Se crea la primera vez que se necesita. Reutiliza las clases CSS
  // .cam-overlay / .cam-modal que ya existen para la cámara de Globos.
  // ---------------------------------------------------------------
  let overlayCamara = null;
  let videoCamara = null;
  let streamCamara = null;
  let alCapturarFoto = null; // función que recibe el Blob de la foto tomada

  function cerrarCamara() {
    if (overlayCamara) {
      overlayCamara.classList.remove('visible');
      overlayCamara.setAttribute('aria-hidden', 'true');
    }
    if (streamCamara) {
      streamCamara.getTracks().forEach(function (pista) { pista.stop(); });
      streamCamara = null;
    }
    if (videoCamara) videoCamara.srcObject = null;
  }

  function capturarDesdeVideo() {
    const ancho = videoCamara.videoWidth || 640;
    const alto = videoCamara.videoHeight || 480;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(videoCamara, 0, 0, ancho, alto);
    cerrarCamara();
    lienzo.toBlob(function (blob) {
      if (!blob) { mostrarAviso('✗ No se pudo capturar la foto, intenta de nuevo'); return; }
      if (alCapturarFoto) alCapturarFoto(blob);
    }, 'image/jpeg', 0.9);
  }

  function asegurarOverlayCamara() {
    if (overlayCamara) return;
    overlayCamara = document.createElement('div');
    overlayCamara.className = 'cam-overlay';
    overlayCamara.setAttribute('aria-hidden', 'true');
    overlayCamara.innerHTML =
      '<div class="cam-modal" role="dialog" aria-label="Cámara">' +
        '<video autoplay playsinline></video>' +
        '<div class="cam-controls">' +
          '<button type="button" class="cam-capture">Tomar foto</button>' +
          '<button type="button" class="cam-close">Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayCamara);
    videoCamara = overlayCamara.querySelector('video');
    overlayCamara.querySelector('.cam-capture').addEventListener('click', capturarDesdeVideo);
    overlayCamara.querySelector('.cam-close').addEventListener('click', cerrarCamara);
    overlayCamara.addEventListener('click', function (e) {
      if (e.target === overlayCamara) cerrarCamara();
    });
  }

  // Abre la cámara. En iPhone/iPad se usa la cámara nativa (input con
  // capture); si la cámara web falla o no existe, se abre la galería.
  function abrirCamara(inputCamara, alCapturar) {
    const esiOS = /iP(hone|od|ad)/.test(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    if (esiOS || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      inputCamara.click();
      return;
    }
    asegurarOverlayCamara();
    alCapturarFoto = alCapturar;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        streamCamara = stream;
        videoCamara.srcObject = stream;
        videoCamara.play().catch(function () {});
        overlayCamara.classList.add('visible');
        overlayCamara.setAttribute('aria-hidden', 'false');
      })
      .catch(function () {
        mostrarAviso('Abriendo galería...');
        inputCamara.click();
      });
  }

  // ===============================================================
  // FORMULARIO DE SECCIÓN (se usa para Batukada y para CD-5)
  // ===============================================================
  function crearFormulario(clave, config, contenedor) {
    const p = clave; // prefijo para los ids: batukada-producto, cd5-producto, ...

    // ---- 1) HTML del formulario (sin datos del usuario, solo estructura) ----
    const bloqueGrupo = config.usaGrupos
      ? '<div class="field">' +
          '<label for="' + p + '-grupo">Grupo</label>' +
          '<select id="' + p + '-grupo" required><option value="">Cargando grupos...</option></select>' +
        '</div>'
      : '';

    contenedor.innerHTML =
      '<div class="header-with-buttons">' +
        '<h1>' + config.titulo + '</h1>' +
        '<div class="button-group">' +
          '<button type="button" id="' + p + '-btn-camara" class="cam-button" aria-label="Tomar foto">📷</button>' +
          '<button type="button" id="' + p + '-btn-archivo" class="cam-button" aria-label="Seleccionar archivo">📁</button>' +
        '</div>' +
      '</div>' +
      '<form id="' + p + '-form">' +
        '<div class="row">' +
          bloqueGrupo +
          '<div class="field">' +
            '<label for="' + p + '-producto">' + config.etiqueta + '</label>' +
            '<select id="' + p + '-producto" required><option value="">Cargando...</option></select>' +
            '<button type="button" id="' + p + '-nuevo" class="btn-admin-inline" style="display:none;">' + config.textoNuevo + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field">' +
            '<label for="' + p + '-ubicacion">Ubicación</label>' +
            '<select id="' + p + '-ubicacion" required><option value="">Cargando ubicaciones...</option></select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="' + p + '-tipo">Tipo de movimiento</label>' +
            '<select id="' + p + '-tipo" required>' +
              '<option value="entrada">Entrada</option>' +
              '<option value="salida">Salida</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        // ¿La cantidad es en paquetes o en piezas sueltas? Son dos botones
        // grandes y NINGUNO viene elegido: hay que tocar uno a propósito, para
        // no registrar por error "1 paquete" (5 o 12 piezas) cuando eran piezas sueltas.
        '<div class="row">' +
          '<div class="field full">' +
            '<label id="' + p + '-unidad-label">La cantidad es en</label>' +
            '<div class="segmented" id="' + p + '-unidad" role="group" aria-labelledby="' + p + '-unidad-label">' +
              '<button type="button" class="segmented-btn" data-unidad="paquetes" aria-pressed="false">Paquetes</button>' +
              '<button type="button" class="segmented-btn" data-unidad="piezas" aria-pressed="false">Piezas sueltas</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field">' +
            '<label for="' + p + '-cantidad">Cantidad</label>' +
            '<input type="number" id="' + p + '-cantidad" min="1" step="1" inputmode="numeric" required />' +
            '<small id="' + p + '-hint" class="hint"></small>' +
          '</div>' +
        '</div>' +
        '<small id="' + p + '-stock" class="hint" style="margin-bottom:16px;"></small>' +
        '<div id="' + p + '-foto-box" class="foto-box" hidden>' +
          '<img alt="Foto del producto" />' +
          '<div class="foto-box-texto">' +
            '<strong></strong>' +
            '<button type="button" id="' + p + '-quitar-foto" class="btn-admin-inline" style="display:none;">Quitar foto nueva</button>' +
          '</div>' +
        '</div>' +
        '<div class="preview">' +
          '<h2>Previsualización</h2>' +
          '<p id="' + p + '-resumen">Completa los campos para ver el resumen.</p>' +
        '</div>' +
        '<div class="actions">' +
          '<button type="button" id="' + p + '-solo-foto" class="btn-secondary">Guardar solo la foto</button>' +
          '<button type="submit" id="' + p + '-guardar">Guardar</button>' +
        '</div>' +
      '</form>' +
      // Inputs de archivo ocultos: uno abre la cámara nativa, el otro la galería
      '<input type="file" id="' + p + '-input-camara" accept="image/*" capture="environment" style="display:none">' +
      '<input type="file" id="' + p + '-input-archivo" accept="image/*" style="display:none">';

    // ---- 2) Referencias a los elementos ----
    const $ = function (sufijo) { return contenedor.querySelector('#' + p + '-' + sufijo); };
    const form = $('form');
    const grupoSelect = $('grupo');          // null en Batukada
    const productoSelect = $('producto');
    const ubicacionSelect = $('ubicacion');
    const tipoSelect = $('tipo');
    // Botones "Paquetes" / "Piezas sueltas" (el valor elegido vive en la variable `unidad`)
    const unidadBotones = Array.prototype.slice.call(
      contenedor.querySelectorAll('#' + p + '-unidad .segmented-btn')
    );
    const cantidadInput = $('cantidad');
    const hint = $('hint');
    const stockHint = $('stock');
    const fotoBox = $('foto-box');
    const fotoImg = fotoBox.querySelector('img');
    const fotoTitulo = fotoBox.querySelector('strong');
    const btnQuitarFoto = $('quitar-foto');
    const resumen = $('resumen');
    const btnGuardar = $('guardar');
    const btnSoloFoto = $('solo-foto');
    const btnNuevo = $('nuevo');
    const inputCamara = $('input-camara');
    const inputArchivo = $('input-archivo');

    // ---- 3) Estado del formulario ----
    let productos = [];        // catálogo de esta sección (viene de la API)
    let ubicaciones = [];
    let grupos = [];
    let fotoSeleccionada = null;   // Blob comprimido, listo para subir
    let fotoUrlTemporal = null;    // URL local para la miniatura (hay que liberarla)
    let consultaStock = 0;         // para ignorar respuestas viejas del stock
    let unidad = null;             // 'paquetes' | 'piezas' | null (aún sin elegir)
    let stockPiezas = null;        // stock actual en piezas (null = desconocido)

    // El botón "+ Nuevo ..." solo lo ve el admin
    botonesNuevo.push(btnNuevo);
    btnNuevo.style.display = esAdmin ? 'inline-block' : 'none';

    // ---- 4) Funciones de apoyo ----
    function productoActual() {
      return productos.find(function (x) { return String(x.id_producto) === productoSelect.value; });
    }
    function ubicacionActual() {
      return ubicaciones.find(function (x) { return String(x.id_ubicacion) === ubicacionSelect.value; });
    }

    // Cantidad capturada como entero > 0, o null si no es válida
    function cantidadValida() {
      const n = Number(cantidadInput.value);
      return Number.isInteger(n) && n > 0 ? n : null;
    }

    // Texto de la cantidad: "3 paquetes (36 piezas)" o "5 piezas"
    function textoCantidad(producto) {
      const n = cantidadValida();
      if (!n) return '';
      if (unidad === 'paquetes') {
        const piezas = producto ? n * producto.piezas_por_paquete : null;
        return n + (n === 1 ? ' paquete' : ' paquetes') + (piezas !== null ? ' (' + piezas + ' piezas)' : '');
      }
      return n + (n === 1 ? ' pieza' : ' piezas');
    }

    // Marca como activo el botón de la unidad elegida
    function pintarUnidad() {
      unidadBotones.forEach(function (btn) {
        const activo = btn.dataset.unidad === unidad;
        btn.classList.toggle('active', activo);
        btn.setAttribute('aria-pressed', String(activo));
      });
    }

    // Texto de ayuda bajo la cantidad: explica cuántas piezas son en total
    function actualizarHint() {
      const producto = productoActual();
      const n = cantidadValida();
      if (!unidad) {
        hint.textContent = 'Primero elige arriba si la cantidad es en paquetes o en piezas sueltas';
      } else if (unidad === 'paquetes') {
        if (!producto) hint.textContent = 'Elige un producto para ver las piezas por paquete';
        else if (n) hint.textContent = n + ' × ' + producto.piezas_por_paquete + ' = ' + (n * producto.piezas_por_paquete) + ' piezas';
        else hint.textContent = '1 paquete = ' + producto.piezas_por_paquete + ' piezas';
      } else {
        hint.textContent = n ? n + (n === 1 ? ' pieza suelta' : ' piezas sueltas') : 'Piezas sueltas (de una en una)';
      }
    }

    function textoResumen() {
      const producto = productoActual();
      const ubicacion = ubicacionActual();
      if (!producto || !ubicacion || !unidad || !cantidadValida()) return '';
      return (tipoSelect.value === 'entrada' ? 'Entrada' : 'Salida') + ' de ' +
        textoCantidad(producto) + '\n' + producto.nombre + ' — ' + ubicacion.nombre;
    }

    function actualizarResumen() {
      resumen.textContent = textoResumen() || 'Completa los campos para ver el resumen.';
    }

    // Muestra la foto nueva (por subir) o, si no hay, la foto actual del producto
    function actualizarFotoBox() {
      const producto = productoActual();
      if (fotoUrlTemporal) { URL.revokeObjectURL(fotoUrlTemporal); fotoUrlTemporal = null; }

      if (fotoSeleccionada) {
        fotoUrlTemporal = URL.createObjectURL(fotoSeleccionada);
        fotoImg.src = fotoUrlTemporal;
        fotoTitulo.textContent = 'Foto nueva (se subirá al guardar)';
        btnQuitarFoto.style.display = 'inline-block';
        fotoBox.hidden = false;
      } else if (producto && producto.foto_url) {
        fotoImg.src = producto.foto_url;
        fotoTitulo.textContent = 'Foto actual del producto';
        btnQuitarFoto.style.display = 'none';
        fotoBox.hidden = false;
      } else {
        fotoBox.hidden = true;
      }
    }

    // Stock actual del producto en la ubicación elegida (solo informativo)
    async function actualizarStock() {
      const producto = productoActual();
      const ubicacion = ubicacionActual();
      stockPiezas = null; // mientras se consulta, el stock es desconocido
      if (!producto || !ubicacion) { stockHint.textContent = ''; return; }

      const miConsulta = ++consultaStock;
      try {
        const filas = await api(API_BASE + '/inventario-producto?id_producto=' +
          producto.id_producto + '&id_ubicacion=' + ubicacion.id_ubicacion);
        if (miConsulta !== consultaStock) return; // llegó tarde: ya cambió la selección
        if (filas.length === 0) {
          stockPiezas = 0;
          stockHint.textContent = 'Sin existencias registradas en ' + ubicacion.nombre;
        } else {
          const f = filas[0];
          stockPiezas = f.piezas;
          stockHint.textContent = 'Stock actual en ' + ubicacion.nombre + ': ' + f.piezas + ' piezas (' +
            f.paquetes_completos + (f.paquetes_completos === 1 ? ' paquete' : ' paquetes') +
            (f.piezas_sueltas ? ' + ' + f.piezas_sueltas + ' sueltas' : '') + ')';
        }
      } catch (err) {
        if (miConsulta === consultaStock) stockHint.textContent = '';
      }
    }

    // Pinta el selector de productos (en CD-5, solo los del grupo elegido)
    function pintarProductos() {
      let lista = productos;
      if (config.usaGrupos) {
        lista = productos.filter(function (x) { return String(x.id_grupo) === grupoSelect.value; });
        productoSelect.disabled = !grupoSelect.value;
      }
      llenarSelect(
        productoSelect, ordenarPorNombre(lista), 'id_producto', 'nombre',
        config.usaGrupos && !grupoSelect.value ? 'Primero elige un grupo' : config.placeholder
      );
    }

    async function cargarProductos() {
      productos = await api(API_BASE + '/producto?clave=' + clave);
      pintarProductos();
    }

    function refrescarTodo() {
      actualizarHint();
      actualizarResumen();
      actualizarFotoBox();
      actualizarStock();
    }

    // Deja el formulario limpio para el siguiente registro
    function reiniciar() {
      form.reset();
      fotoSeleccionada = null;
      unidad = null;
      pintarUnidad();
      if (config.usaGrupos) pintarProductos();
      refrescarTodo();
    }

    // ---- 5) Fotos ----
    async function procesarFoto(archivo) {
      try {
        fotoSeleccionada = await comprimirImagen(archivo);
        mostrarAviso('✓ Foto lista (' + Math.round(fotoSeleccionada.size / 1024) + ' KB) — se subirá al guardar');
      } catch (err) {
        console.error('Error al comprimir foto:', err);
        // Si falla la compresión se usa el archivo original: mejor una foto pesada que ninguna
        fotoSeleccionada = archivo;
        mostrarAviso('✓ Foto lista — se subirá al guardar');
      }
      actualizarFotoBox();
    }

    function alElegirArchivo(e) {
      const archivo = e.target.files && e.target.files[0];
      e.target.value = ''; // permite elegir la misma foto otra vez
      if (!archivo) return;
      if (!archivo.type.startsWith('image/')) { mostrarAviso('Selecciona una imagen válida'); return; }
      procesarFoto(archivo);
    }

    // Sube la foto seleccionada al producto. Regresa { ok, status }.
    // Nunca lanza error: si falla, el que llama decide qué avisar.
    async function subirFoto(producto) {
      try {
        const datos = new FormData();
        datos.append('foto', fotoSeleccionada, 'foto.jpg'); // "foto" = campo que espera multer
        const res = await fetch(API_BASE + '/producto/' + producto.id_producto + '/foto', {
          method: 'POST',
          credentials: 'include',
          body: datos // sin Content-Type: el navegador arma el boundary solo
        });
        if (res.ok) {
          const actualizado = await res.json().catch(function () { return null; });
          if (actualizado && actualizado.foto_url) producto.foto_url = actualizado.foto_url;
        }
        return { ok: res.ok, status: res.status };
      } catch (err) {
        console.error('Error al subir foto:', err);
        return { ok: false, status: 0 };
      }
    }

    $('btn-camara').addEventListener('click', function () {
      abrirCamara(inputCamara, procesarFoto);
    });
    $('btn-archivo').addEventListener('click', function () { inputArchivo.click(); });
    inputCamara.addEventListener('change', alElegirArchivo);
    inputArchivo.addEventListener('change', alElegirArchivo);

    btnQuitarFoto.addEventListener('click', function () {
      fotoSeleccionada = null;
      actualizarFotoBox();
    });

    // ---- 6) Eventos de los campos ----
    if (grupoSelect) {
      grupoSelect.addEventListener('change', function () {
        pintarProductos();
        refrescarTodo();
      });
    }
    productoSelect.addEventListener('change', refrescarTodo);
    ubicacionSelect.addEventListener('change', refrescarTodo);
    tipoSelect.addEventListener('change', actualizarResumen);
    unidadBotones.forEach(function (btn) {
      btn.addEventListener('click', function () {
        unidad = btn.dataset.unidad;
        pintarUnidad();
        actualizarHint();
        actualizarResumen();
      });
    });
    cantidadInput.addEventListener('input', function () { actualizarHint(); actualizarResumen(); });

    // ---- 7) Guardar el movimiento ----
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const producto = productoActual();
      const ubicacion = ubicacionActual();
      const cantidad = cantidadValida();

      if (!producto || !ubicacion) { mostrarAviso('Selecciona el producto y la ubicación'); return; }
      if (!unidad) { mostrarAviso('Elige si la cantidad es en paquetes o en piezas sueltas'); return; }
      if (!cantidad) { mostrarAviso('La cantidad debe ser un número entero mayor a 0'); return; }

      // Si es una salida mayor al stock conocido, se avisa en la confirmación
      // (no se bloquea: puede que el inventario inicial aún no esté capturado).
      let advertencia = '';
      if (tipoSelect.value === 'salida' && stockPiezas !== null) {
        const piezasSalida = unidad === 'paquetes' ? cantidad * producto.piezas_por_paquete : cantidad;
        if (piezasSalida > stockPiezas) {
          advertencia = '\n\n⚠ OJO: en ' + ubicacion.nombre + ' hay ' + stockPiezas +
            ' piezas y esta salida es de ' + piezasSalida + '. El inventario quedaría en negativo.';
        }
      }

      // Confirmación: en el celular es fácil tocar "Guardar" por error y un
      // movimiento guardado no se deshace desde esta pantalla.
      const confirmado = confirm(
        '¿Confirmas este movimiento?\n\n' + textoResumen() + '\n' +
        (fotoSeleccionada ? 'Foto: lista para subir' : 'Foto: NO hay foto seleccionada') +
        advertencia
      );
      if (!confirmado) return;

      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';

      try {
        // 1) Registrar el movimiento. La conversión paquetes -> piezas la hace el servidor.
        await api(API_BASE + '/movimiento-producto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id_producto: producto.id_producto,
            id_ubicacion: ubicacion.id_ubicacion,
            tipo: tipoSelect.value,
            cantidad: cantidad,
            unidad: unidad
          })
        });

        // 2) Subir la foto (opcional). Va DESPUÉS del movimiento a propósito: si
        //    la foto falla, el movimiento ya quedó guardado y nadie pierde su captura.
        let mensaje = '✓ Movimiento guardado — ' + producto.nombre;
        if (fotoSeleccionada) {
          const resultado = await subirFoto(producto);
          if (resultado.ok) {
            mensaje += ' (con foto)';
          } else if (resultado.status === 403) {
            mensaje += '. (La foto no se actualizó: ya existe una y solo un admin puede reemplazarla)';
          } else {
            mensaje += '. (No se pudo subir la foto — error ' + resultado.status + '. Usa "Guardar solo la foto")';
          }
        }
        mostrarAviso(mensaje, 6000);
        reiniciar();
      } catch (err) {
        console.error(err);
        mostrarAviso('✗ ' + err.message, 6000);
      } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
      }
    });

    // ---- 8) Guardar SOLO la foto (sin crear ningún movimiento) ----
    btnSoloFoto.addEventListener('click', async function () {
      const producto = productoActual();
      if (!producto) { mostrarAviso('Primero selecciona el producto'); return; }
      if (!fotoSeleccionada) { mostrarAviso('Primero toma o selecciona una foto'); return; }
      if (producto.foto_url && !esAdmin) {
        mostrarAviso('Este producto ya tiene foto. Solo un administrador puede reemplazarla.', 5000);
        return;
      }
      const confirmado = confirm(
        '¿Subir esta foto a "' + producto.nombre + '"?' +
        (producto.foto_url ? '\n\nOJO: ya tiene una foto y será REEMPLAZADA.' : '')
      );
      if (!confirmado) return;

      btnSoloFoto.disabled = true;
      btnSoloFoto.textContent = 'Subiendo foto...';
      const resultado = await subirFoto(producto);
      btnSoloFoto.disabled = false;
      btnSoloFoto.textContent = 'Guardar solo la foto';

      if (resultado.ok) {
        mostrarAviso('✓ Foto guardada en ' + producto.nombre);
        fotoSeleccionada = null;
        actualizarFotoBox();
      } else {
        mostrarAviso('✗ No se pudo subir la foto (error ' + resultado.status + ')', 5000);
      }
    });

    // ---- 9) Botón de admin: crear un producto/tema nuevo ----
    btnNuevo.addEventListener('click', async function () {
      if (config.usaGrupos && !grupoSelect.value) {
        mostrarAviso('Primero elige el grupo donde va el nuevo tema');
        return;
      }
      const nombre = prompt('Nombre del nuevo ' + config.etiqueta.toLowerCase() + ':');
      if (!nombre || !nombre.trim()) return;

      try {
        const nuevo = await api(API_BASE + '/producto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            clave: clave,
            id_grupo: config.usaGrupos ? Number(grupoSelect.value) : null,
            nombre: nombre.trim(),
            piezas_por_paquete: config.piezasPorPaquete
          })
        });
        await cargarProductos();
        productoSelect.value = String(nuevo.id_producto); // lo deja elegido
        refrescarTodo();
        mostrarAviso('✓ Creado: ' + nuevo.nombre + ' (' + nuevo.codigo_interno + ')');
      } catch (err) {
        mostrarAviso('✗ ' + err.message, 5000);
      }
    });

    // ---- 10) Carga inicial: ubicaciones, grupos (si aplica) y productos ----
    (async function iniciar() {
      try {
        const cargas = [api(API_BASE + '/ubicacion'), cargarProductos()];
        if (config.usaGrupos) cargas.push(api(API_BASE + '/grupo?clave=' + clave));
        const resultados = await Promise.all(cargas);

        ubicaciones = resultados[0];
        llenarSelect(ubicacionSelect, ubicaciones, 'id_ubicacion', 'nombre', 'Selecciona ubicación');

        if (config.usaGrupos) {
          grupos = resultados[2]; // ya vienen en el orden definido en la base
          llenarSelect(grupoSelect, grupos, 'id_grupo', 'nombre', 'Selecciona grupo');
          pintarProductos();
        }
        refrescarTodo();
      } catch (err) {
        console.error(err);
        mostrarAviso('✗ No se pudo cargar ' + config.titulo + ': ' + err.message, 6000);
      }
    })();
  }

  // ===============================================================
  // BARRA DE SECCIONES
  // ===============================================================
  const pestanas = Array.prototype.slice.call(document.querySelectorAll('.section-tab'));
  const paneles = Array.prototype.slice.call(document.querySelectorAll('.seccion-panel'));
  const formulariosIniciados = {}; // clave -> true cuando ya se dibujó su formulario

  function activarSeccion(clave) {
    // Si la clave no existe (ej. un # raro en la URL), se abre Globos
    if (!paneles.some(function (panel) { return panel.dataset.panel === clave; })) {
      clave = 'globos';
    }

    paneles.forEach(function (panel) { panel.hidden = panel.dataset.panel !== clave; });
    pestanas.forEach(function (pestana) {
      const activa = pestana.dataset.seccion === clave;
      pestana.classList.toggle('active', activa);
      pestana.setAttribute('aria-selected', String(activa));
      // En el celular, deja visible la pestaña activa dentro de la barra deslizable
      if (activa && pestana.scrollIntoView) {
        pestana.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    });

    // Dibuja el formulario de la sección solo la primera vez que se abre
    if (SECCIONES[clave] && !formulariosIniciados[clave]) {
      formulariosIniciados[clave] = true;
      crearFormulario(clave, SECCIONES[clave], document.getElementById('panel-' + clave));
    }

    // Guarda la sección en la URL (#batukada) sin agregar entradas al historial
    if (window.history && history.replaceState) {
      history.replaceState(null, '', '#' + clave);
    }
  }

  pestanas.forEach(function (pestana) {
    pestana.addEventListener('click', function () {
      activarSeccion(pestana.dataset.seccion);
      window.scrollTo({ top: 0 }); // cada sección empieza desde arriba
    });
  });

  // Al cargar la página abre la sección que diga la URL (o Globos)
  activarSeccion(location.hash.replace('#', '') || 'globos');
})();
