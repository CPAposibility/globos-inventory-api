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
    throw new Error(errBody.message || `Error ${res.status} en ${url}`);
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
    showToast('✓ Foto capturada (aún no se sube al servidor)');
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
    showToast('✓ Foto agregada (aún no se sube al servidor)');
  });

  fileInputLocal && fileInputLocal.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen válida'); return; }
    showToast('✓ Foto agregada (aún no se sube al servidor)');
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
        globo = await fetchJSON(`${API_BASE}/globo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_marca, id_estilo, id_tamano, id_color, codigo_interno })
        });
      }

      // 2) Registrar el movimiento real
      await fetchJSON(`${API_BASE}/movimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_globo: globo.id_globo,
          id_ubicacion,
          tipo_movimiento,
          cantidad,
          nota: derivado || null
        })
      });

      stopStream();
      showToast(`✓ Movimiento guardado — Código: ${codigo_interno}`);

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
