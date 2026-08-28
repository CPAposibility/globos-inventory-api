/**
 * Script para el formulario de Registro de Globos (formulario2.html)
 * - Carga marcas, estilos, tamaños, colores y ubicaciones desde la API real
 * - Genera el código interno automáticamente
 * - Al guardar: busca o crea el SKU (globo) y registra el movimiento real
 * - Maneja captura/selección de imagen (cámara/galería) — la foto por ahora
 *   solo se previsualiza, todavía no se sube al servidor (pendiente futuro)
 */

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9\-]/g, "");
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const error = new Error(errBody.message || `Error ${res.status} en ${url}`);
    // Guardamos el código HTTP en el propio error (ej. 403, 404, 500).
    // Esto permite que quien capture el error más adelante (como el
    // manejador del submit) pueda reaccionar distinto según el tipo
    // de problema — por ejemplo, un 403 casi siempre significa "no
    // tienes permiso para esto", no un error técnico real.
    error.status = res.status;
    throw error;
  }
  return res.json();
}

document.addEventListener('DOMContentLoaded', function () {
  const marcaSelect = document.getElementById('marca');
  const estiloSelect = document.getElementById('estilo');
  const tamanoSelect = document.getElementById('tamano');
  const colorSelect = document.getElementById('color');
  const colorDerivadoInput = document.getElementById('color-derivado');
  const ubicacionSelect = document.getElementById('ubicacion');
  const tipoMovimientoSelect = document.getElementById('tipo_movimiento');
  const cantidadInput = document.getElementById('cantidad');
  const codigoInput = document.getElementById('codigo');
  const previewText = document.getElementById('preview-text');
  const form = document.getElementById('form-globos');
  const btnGuardar = document.getElementById('btn-guardar');

  // Elementos de cámara/galería
  const btnFoto = document.getElementById('btn-foto');
  const btnArchivo = document.getElementById('btn-archivo');
  const fileInput = document.getElementById('foto_producto_input');
  const fileInputLocal = document.getElementById('foto_archivo_input');
  const overlay = document.getElementById('cam-overlay');
  const video = document.getElementById('cam_video');
  const captureBtn = document.getElementById('cam_capture');
  const closeBtn = document.getElementById('cam_close');
  const canvas = document.getElementById('cam_canvas');
  let stream = null;

  // Guarda el archivo (File o Blob) de la foto que el usuario tomó o
  // seleccionó, hasta que se suba al servidor al guardar el movimiento.
  // Es opcional: si queda en null, el movimiento se guarda sin foto.
  let fotoSeleccionada = null;

  // Catálogo cargado desde la API (se llena en cargarCatalogoInicial)
  const CATALOGO = {
    marcas: [],
    estilos: [],
    tamanos: [],
    ubicaciones: [],
    coloresPorMarca: [] // se recarga cada vez que cambia la marca
  };

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function showToast(msg, timeout = 3000) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-message';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), timeout);
  }

  function openCameraOverlay() {
    const isiOS = /iP(hone|od|ad)/.test(navigator.platform) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    if (isiOS) {
      fileInput.click();
      return;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          video.srcObject = s;
          video.play().catch(() => {});
          overlay.classList.add('visible');
          overlay.setAttribute('aria-hidden', 'false');
        })
        .catch(() => {
          showToast('Abriendo galería...');
          fileInput.click();
        });
    } else {
      fileInput.click();
    }
  }

  btnFoto.addEventListener('click', openCameraOverlay);

  function openFileSelector() {
    if (fileInputLocal) fileInputLocal.click();
  }
  btnArchivo && btnArchivo.addEventListener('click', openFileSelector);

  captureBtn && captureBtn.addEventListener('click', () => {
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    stopStream();

    // canvas.toBlob es asíncrono (recibe un callback), por eso
    // fotoSeleccionada se asigna dentro de él, no justo después.
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('✗ No se pudo capturar la foto, intenta de nuevo');
        return;
      }
      fotoSeleccionada = blob;
      showToast('✓ Foto lista — se subirá al guardar');
    }, 'image/jpeg', 0.9);
  });

  closeBtn && closeBtn.addEventListener('click', () => {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    stopStream();
  });

  overlay && overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      stopStream();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen válida'); return; }
    fotoSeleccionada = file;
    showToast('✓ Foto lista — se subirá al guardar');
  });

  fileInputLocal && fileInputLocal.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen válida'); return; }
    fotoSeleccionada = file;
    showToast('✓ Foto lista — se subirá al guardar');
  });

  // ---------- Helpers de catálogo ----------

  function llenarSelect(select, items, valueKey, textKey, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[valueKey];
      opt.textContent = item[textKey];
      select.appendChild(opt);
    });
  }

  function buscarPorId(lista, valueKey, id) {
    return lista.find(item => String(item[valueKey]) === String(id));
  }

  // ---------- Código interno y previsualización ----------

  function generateCode() {
    const marca = buscarPorId(CATALOGO.marcas, 'id_marca', marcaSelect.value);
    const estilo = buscarPorId(CATALOGO.estilos, 'id_estilo', estiloSelect.value);
    const tamano = buscarPorId(CATALOGO.tamanos, 'id_tamano', tamanoSelect.value);
    const color = buscarPorId(CATALOGO.coloresPorMarca, 'id_color', colorSelect.value);
    const derivado = colorDerivadoInput ? colorDerivadoInput.value.trim() : '';

    if (!marca || !estilo || !tamano || !color) {
      codigoInput.value = '';
      return;
    }

    let colorCode = normalizarTexto(color.color).slice(0, 3);
    if (derivado) {
      const dcode = normalizarTexto(derivado).slice(0, 3);
      if (dcode) colorCode += dcode;
    }

    const partes = [
      normalizarTexto(marca.nombre).slice(0, 3),
      normalizarTexto(estilo.estilo).slice(0, 3),
      String(tamano.tamano).padStart(2, '0'),
      colorCode
    ];

    codigoInput.value = partes.join('-');
  }

  function updatePreview() {
    const marca = buscarPorId(CATALOGO.marcas, 'id_marca', marcaSelect.value);
    const estilo = buscarPorId(CATALOGO.estilos, 'id_estilo', estiloSelect.value);
    const tamano = buscarPorId(CATALOGO.tamanos, 'id_tamano', tamanoSelect.value);
    const color = buscarPorId(CATALOGO.coloresPorMarca, 'id_color', colorSelect.value);
    const ubicacion = buscarPorId(CATALOGO.ubicaciones, 'id_ubicacion', ubicacionSelect.value);
    const derivado = colorDerivadoInput ? colorDerivadoInput.value.trim() : '';
    const cantidad = cantidadInput.value;
    const tipo = tipoMovimientoSelect.value;

    if (!marca || !estilo || !tamano || !color || !cantidad || !ubicacion) {
      previewText.textContent = 'Completa los campos para ver el resumen.';
      return;
    }

    let colorText = color.color;
    if (derivado) colorText += ` (${derivado})`;

    previewText.innerHTML = `
      <strong>${marca.nombre}</strong> ${estilo.estilo} |
      ${tamano.tamano}" | ${colorText}<br>
      <em>${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cantidad} globos — ${ubicacion.nombre}</em>
    `;
  }

  // ---------- Carga inicial del catálogo ----------

  async function cargarCatalogoInicial() {
    try {
      const [marcas, estilos, tamanos, ubicaciones] = await Promise.all([
        fetchJSON(`${API_BASE}/marca`),
        fetchJSON(`${API_BASE}/estilo`),
        fetchJSON(`${API_BASE}/tamano`),
        fetchJSON(`${API_BASE}/ubicacion`)
      ]);

      CATALOGO.marcas = marcas;
      CATALOGO.estilos = estilos;
      CATALOGO.tamanos = tamanos;
      CATALOGO.ubicaciones = ubicaciones;

      llenarSelect(marcaSelect, marcas, 'id_marca', 'nombre', 'Selecciona marca');
      llenarSelect(ubicacionSelect, ubicaciones, 'id_ubicacion', 'nombre', 'Selecciona ubicación');
      ubicacionSelect.disabled = false;
      tipoMovimientoSelect.disabled = false;
    } catch (err) {
      console.error(err);
      marcaSelect.innerHTML = '<option value="">Error al cargar — revisa la API</option>';
      showToast('✗ No se pudo conectar con la API. Revisa que el servidor esté corriendo.', 5000);
    }
  }

  cargarCatalogoInicial();

  // ---------- Cadena de selects ----------

  marcaSelect.addEventListener('change', async function () {
    estiloSelect.innerHTML = '<option value="">Selecciona estilo</option>';
    tamanoSelect.innerHTML = '<option value="">Selecciona tamaño</option>';
    colorSelect.innerHTML = '<option value="">Selecciona color</option>';
    estiloSelect.disabled = !this.value;
    tamanoSelect.disabled = true;
    colorSelect.disabled = true;
    cantidadInput.disabled = true;
    codigoInput.value = '';

    if (this.value) {
      llenarSelect(estiloSelect, CATALOGO.estilos, 'id_estilo', 'estilo', 'Selecciona estilo');
      // Los colores dependen de la marca — se piden ahora y se guardan
      // para cuando el usuario llegue al select de color.
      try {
        CATALOGO.coloresPorMarca = await fetchJSON(`${API_BASE}/color?id_marca=${this.value}`);
      } catch (err) {
        console.error(err);
        CATALOGO.coloresPorMarca = [];
      }
    }

    generateCode();
    updatePreview();
  });

  estiloSelect.addEventListener('change', function () {
    tamanoSelect.innerHTML = '<option value="">Selecciona tamaño</option>';
    colorSelect.innerHTML = '<option value="">Selecciona color</option>';
    tamanoSelect.disabled = !this.value;
    colorSelect.disabled = true;
    cantidadInput.disabled = true;

    if (this.value) {
      llenarSelect(tamanoSelect, CATALOGO.tamanos, 'id_tamano', 'tamano', 'Selecciona tamaño');
    }
    generateCode();
    updatePreview();
  });

  const derivadoWrapper = document.getElementById('derivado-wrapper');
  const btnNuevoColor = document.getElementById('btn-nuevo-color');

  // Se llena cuando session.js confirma quién es el usuario logueado
  // (ver el listener del evento 'sesion-lista' más abajo). Empieza en
  // false para que, mientras se confirma la sesión, el botón de admin
  // se mantenga oculto por seguridad visual (aunque la protección
  // real vive en el backend, no aquí).
  let esAdmin = false;

  tamanoSelect.addEventListener('change', function () {
    colorSelect.innerHTML = '<option value="">Selecciona color</option>';
    colorSelect.disabled = !this.value;
    cantidadInput.disabled = true;

    if (this.value) {
      if (CATALOGO.coloresPorMarca.length === 0) {
        colorSelect.innerHTML = '<option value="">Sin colores para esta marca — agrega uno primero</option>';
      } else {
        llenarSelect(colorSelect, CATALOGO.coloresPorMarca, 'id_color', 'color', 'Selecciona color');
      }
    }

    // El botón "+ Nuevo color" solo se muestra si: (a) el usuario es
    // admin, y (b) ya hay una marca elegida (se necesita su id_marca
    // para crear el color correctamente). No depende de si ya hay
    // colores o no — un admin puede querer agregar más variaciones
    // aunque ya existan otras.
    if (btnNuevoColor) {
      btnNuevoColor.style.display = (esAdmin && marcaSelect.value) ? 'inline-block' : 'none';
    }

    generateCode();
    updatePreview();
  });

  colorSelect.addEventListener('change', function () {
    const habilitar = !!this.value;
    cantidadInput.disabled = !habilitar;
    if (colorDerivadoInput) colorDerivadoInput.disabled = !habilitar;
    if (derivadoWrapper) derivadoWrapper.style.display = habilitar ? '' : 'none';
    if (!habilitar && colorDerivadoInput) colorDerivadoInput.value = '';

    generateCode();
    updatePreview();
  });

  // ---------- Administración de catálogo: crear color nuevo ----------

  // session.js dispara este evento cuando ya confirmó con el backend
  // quién es el usuario logueado (ver GET /api/v1/auth/me). Aquí solo
  // reaccionamos activando/desactivando esAdmin — el botón en sí se
  // muestra/oculta en el listener de tamanoSelect de arriba, así que
  // si el evento llega DESPUÉS de que el usuario ya eligió tamaño,
  // volvemos a evaluar la visibilidad aquí también.
  document.addEventListener('sesion-lista', function (evt) {
    esAdmin = evt.detail && evt.detail.rol === 'admin';
    if (btnNuevoColor) {
      btnNuevoColor.style.display = (esAdmin && marcaSelect.value && tamanoSelect.value) ? 'inline-block' : 'none';
    }
  });

  if (btnNuevoColor) {
    btnNuevoColor.addEventListener('click', async function () {
      const id_marca = marcaSelect.value;
      if (!id_marca) {
        showToast('Primero selecciona una marca');
        return;
      }

      // prompt() es lo más simple posible para esta acción puntual de
      // administrador — no justifica construir un modal completo para
      // capturar un solo campo de texto. Si en el futuro se necesita
      // capturar más datos al crear un color, ahí sí conviene un modal.
      const nombreColor = prompt('Nombre del color nuevo (ej. "Verde militar"):');
      if (!nombreColor || !nombreColor.trim()) return; // canceló o dejó vacío

      btnNuevoColor.disabled = true;
      btnNuevoColor.textContent = 'Guardando...';

      try {
        await fetchJSON(`${API_BASE}/color`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id_marca, color: nombreColor.trim() })
        });

        // Refrescamos la lista de colores de esta marca para que el
        // nuevo color aparezca de inmediato en el select, sin tener
        // que recargar toda la página.
        CATALOGO.coloresPorMarca = await fetchJSON(`${API_BASE}/color?id_marca=${id_marca}`);
        llenarSelect(colorSelect, CATALOGO.coloresPorMarca, 'id_color', 'color', 'Selecciona color');
        colorSelect.disabled = false;

        showToast(`✓ Color "${nombreColor.trim()}" agregado`);
      } catch (err) {
        showToast(`✗ No se pudo crear el color: ${err.message}`, 5000);
      } finally {
        btnNuevoColor.disabled = false;
        btnNuevoColor.textContent = '+ Nuevo color';
      }
    });
  }

  if (colorDerivadoInput) {
    colorDerivadoInput.addEventListener('input', function () {
      generateCode();
      updatePreview();
    });
  }
  cantidadInput.addEventListener('input', updatePreview);
  ubicacionSelect.addEventListener('change', updatePreview);
  tipoMovimientoSelect.addEventListener('change', updatePreview);

  // ---------- Guardar: buscar o crear el globo + registrar movimiento ----------

  form.addEventListener('submit', async function (evt) {
    evt.preventDefault();

    const id_marca = marcaSelect.value;
    const id_estilo = estiloSelect.value;
    const id_tamano = tamanoSelect.value;
    const id_color = colorSelect.value;
    const id_ubicacion = ubicacionSelect.value;
    const tipo_movimiento = tipoMovimientoSelect.value;
    const cantidad = Number(cantidadInput.value);
    const codigo_interno = codigoInput.value;
    const derivado = colorDerivadoInput ? colorDerivadoInput.value.trim() : '';

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
      // 1) ¿Ya existe este SKU (marca+estilo+tamaño+color)?
      const query = `id_marca=${id_marca}&id_estilo=${id_estilo}&id_tamano=${id_tamano}&id_color=${id_color}`;
      const existentes = await fetchJSON(`${API_BASE}/globo?${query}`);

      let globo;
      if (existentes.length > 0) {
        globo = existentes[0];
      } else {
        // Crear un producto (globo) NUEVO está restringido solo a
        // usuarios "admin" (ver api/v1/middlewares/apiGuard.js en el
        // backend). Si un empleado llega aquí porque el producto no
        // existía todavía, el backend responde 403 — lo capturamos
        // aparte para dar un mensaje claro en vez del genérico.
        try {
          globo = await fetchJSON(`${API_BASE}/globo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id_marca, id_estilo, id_tamano, id_color, codigo_interno })
          });
        } catch (errCrear) {
          if (errCrear.status === 403) {
            throw new Error('Este producto no existe todavía en el catálogo. Pide a un administrador que lo agregue primero.');
          }
          throw errCrear;
        }
      }

      // 2) Registrar el movimiento real
      await fetchJSON(`${API_BASE}/movimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_globo: globo.id_globo,
          id_ubicacion,
          tipo_movimiento,
          cantidad,
          nota: derivado || null
        })
      });

      // 3) Si el usuario tomó/seleccionó una foto, subirla ahora.
      //    Es opcional: si fotoSeleccionada es null, este bloque no
      //    hace nada y el movimiento ya quedó guardado sin foto.
      //
      //    Este paso va DESPUÉS de guardar el movimiento a propósito:
      //    si la foto falla por cualquier motivo (ej. el producto ya
      //    tenía una foto y este usuario no es admin), el movimiento
      //    de inventario ya se guardó de todos modos — no queremos
      //    que un problema con la foto le impida a alguien registrar
      //    su entrada/salida de mercancía.
      if (fotoSeleccionada) {
        try {
          const datosFoto = new FormData();
          // La clave "foto" debe coincidir exactamente con lo que
          // espera el backend: upload.single("foto") en
          // api/v1/globo/routers.js
          datosFoto.append('foto', fotoSeleccionada, 'foto.jpg');

          const resFoto = await fetch(`${API_BASE}/globo/${globo.id_globo}/foto`, {
            method: 'POST',
            credentials: 'include', // manda la cookie de sesión (httpOnly)
            body: datosFoto
            // OJO: NO se pone header 'Content-Type' aquí — el navegador
            // lo arma solo (incluye el "boundary" necesario para
            // FormData). Ponerlo a mano rompe la subida.
          });

          if (resFoto.ok) {
            showToast(`✓ Movimiento guardado con foto — Código: ${codigo_interno}`);
          } else if (resFoto.status === 403) {
            // Este producto ya tenía foto y el usuario no es admin —
            // no es un error grave, el movimiento sí se guardó bien.
            showToast(`✓ Movimiento guardado — Código: ${codigo_interno}. (La foto no se actualizó: ya existe una y solo un admin puede reemplazarla)`, 6000);
          } else {
            showToast(`✓ Movimiento guardado — Código: ${codigo_interno}. (No se pudo subir la foto, intenta más tarde)`, 5000);
          }
        } catch (errFoto) {
          // Error de red al subir la foto — igual, el movimiento ya
          // se guardó, solo avisamos que la foto no se subió.
          console.error('Error al subir foto:', errFoto);
          showToast(`✓ Movimiento guardado — Código: ${codigo_interno}. (No se pudo subir la foto)`, 5000);
        }
      } else {
        showToast(`✓ Movimiento guardado — Código: ${codigo_interno}`);
      }

      fotoSeleccionada = null; // limpiar para el siguiente producto
      stopStream();

      setTimeout(() => {
        form.reset();
        estiloSelect.innerHTML = '<option value="">Selecciona estilo</option>';
        tamanoSelect.innerHTML = '<option value="">Selecciona tamaño</option>';
        colorSelect.innerHTML = '<option value="">Selecciona color</option>';
        estiloSelect.disabled = true;
        tamanoSelect.disabled = true;
        colorSelect.disabled = true;
        cantidadInput.disabled = true;
        codigoInput.value = '';
        previewText.textContent = 'Completa los campos para ver el resumen.';
      }, 400);

    } catch (err) {
      console.error(err);
      showToast(`✗ Error al guardar: ${err.message}`, 5000);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  });

  const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
  if (btnNuevoProducto) {
    btnNuevoProducto.addEventListener('click', function () {
      form.reset();
      fotoSeleccionada = null; // evita subir por error la foto del producto anterior
      estiloSelect.innerHTML = '<option value="">Selecciona estilo</option>';
      tamanoSelect.innerHTML = '<option value="">Selecciona tamaño</option>';
      colorSelect.innerHTML = '<option value="">Selecciona color</option>';
      estiloSelect.disabled = true;
      tamanoSelect.disabled = true;
      colorSelect.disabled = true;
      cantidadInput.disabled = true;
      codigoInput.value = '';
      previewText.textContent = 'Completa los campos para ver el resumen.';
      marcaSelect.focus();
      showToast('Nuevo producto listo');
    });
  }
});
