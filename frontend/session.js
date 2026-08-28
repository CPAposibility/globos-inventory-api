// frontend/session.js
//
// Script compartido para cualquier página dentro de /app/ (herramienta
// interna). Se encarga de 2 cosas:
//   1. Preguntarle al backend "¿quién soy?" (GET /api/v1/auth/me) y
//      mostrar el nombre en la barra de sesión.
//   2. Manejar el botón de "Cerrar sesión".
//
// Nota: la protección REAL contra acceso no autorizado ya la hace el
// servidor (requireAppSession en app.js, que redirige antes de
// siquiera entregar el HTML). Este script es solo para mostrar quién
// está logueado y ofrecer el logout — es una mejora de experiencia,
// no la barrera de seguridad.

document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('btn-logout');

  try {
    const res = await fetch('/api/v1/auth/me', { credentials: 'include' });

    if (!res.ok) {
      // La sesión expiró justo mientras la página estaba abierta
      // (ej. pasaron las 6 horas). Regresamos a login.
      window.location.href = '/login.html';
      return;
    }

    const usuario = await res.json();
    if (userNameEl) {
      userNameEl.textContent = `${usuario.nombre} (${usuario.rol})`;
    }

    // Guardamos el usuario en una variable global, por si otro script
    // en la página (ej. form-globos.js) necesita saber el rol para
    // mostrar u ocultar botones administrativos.
    window.usuarioActual = usuario;

    // Disparamos un evento personalizado en vez de solo llenar la
    // variable global, porque form-globos.js.js podría estar corriendo
    // SU PROPIO "DOMContentLoaded" antes de que este fetch (asíncrono)
    // termine — window.usuarioActual llegaría tarde. Escuchando este
    // evento, cualquier script reacciona en el momento exacto en que
    // el usuario ya está confirmado, sin importar el orden de carga.
    document.dispatchEvent(new CustomEvent('sesion-lista', { detail: usuario }));
  } catch (err) {
    // Error de red u otro problema — por seguridad, tratamos como
    // sesión no confirmada y regresamos a login.
    window.location.href = '/login.html';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } finally {
        window.location.href = '/login.html';
      }
    });
  }
});
