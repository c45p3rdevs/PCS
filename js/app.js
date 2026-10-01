// app.js — Lógica principal: sesión, navegación y utilidades compartidas.

const App = {
  vistaActual: 'dashboard',

  async init() {
    await DB_ready;
    const hay = await Auth.hayUsuarios();
    
    const pantallaCarga = document.getElementById('pantalla-carga');
    if (pantallaCarga) pantallaCarga.classList.add('oculto');

    const sesion = Auth.sesionActual();
    if (sesion) {
      this.mostrarApp(sesion);
    } else {
      this.mostrarLogin(!hay);
    }

    this.bindLoginForms();
    this.bindNav();
  },

  mostrarLogin(esRegistro) {
    document.getElementById('vista-login')?.classList.remove('oculto');
    document.getElementById('app-shell')?.classList.add('oculto');
    
    if (esRegistro) {
      document.getElementById('titulo-login').textContent = 'Crear cuenta';
      document.getElementById('subt-login').textContent = 'Primer acceso — crea el usuario administrador';
      document.getElementById('form-login').classList.add('oculto');
      document.getElementById('form-registro').classList.remove('oculto');
    } else {
      document.getElementById('titulo-login').textContent = 'Iniciar sesión';
      document.getElementById('subt-login').textContent = 'Control de carnicería — acceso local';
      document.getElementById('form-login').classList.remove('oculto');
      document.getElementById('form-registro').classList.add('oculto');
    }
  },

  bindLoginForms() {
    // Formulario de Inicio de Sesión
    document.getElementById('form-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usuario = document.getElementById('login-usuario').value;
      const password = document.getElementById('login-password').value;
      const msg = document.getElementById('mensaje-login');
      msg.innerHTML = '';

      const r = await Auth.login(usuario, password);
      if (!r.ok) {
        msg.innerHTML = `<div class="error-msg">${r.error}</div>`;
        return;
      }
      this.mostrarApp(Auth.sesionActual());
    });

    // Formulario de Registro
    document.getElementById('form-registro')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('reg-nombre').value.trim();
      const usuario = document.getElementById('reg-usuario').value.trim();
      const password = document.getElementById('reg-password').value;
      const msg = document.getElementById('mensaje-login');
      msg.innerHTML = '';

      try {
        const resCrear = await Auth.crearUsuario(usuario, password, nombre);
        if (!resCrear.ok) {
          msg.innerHTML = `<div class="error-msg">${resCrear.error}</div>`;
          return;
        }

        const r = await Auth.login(usuario, password);
        if (r.ok) {
          location.reload();
        } else {
          msg.innerHTML = `<div class="error-msg">${r.error}</div>`;
        }
      } catch (error) {
        msg.innerHTML = `<div class="error-msg">Error al crear la cuenta: ${error.message || 'Intente de nuevo'}</div>`;
      }
    });
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.irVista(btn.dataset.vista));
    });
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
      Auth.logout();
      location.reload();
    });
  },

  mostrarApp(sesion) {
    document.getElementById('vista-login')?.classList.add('oculto');
    document.getElementById('app-shell')?.classList.remove('oculto');
    
    const elemNombre = document.getElementById('nombre-usuario-actual');
    const elemAvatar = document.getElementById('avatar-usuario-actual');
    
    if (elemNombre) elemNombre.textContent = sesion.nombre || sesion.usuario;
    if (elemAvatar) elemAvatar.textContent = (sesion.nombre || sesion.usuario).slice(0, 1).toUpperCase();
    
    this.irVista('dashboard');
  },

  irVista(nombre) {
    this.vistaActual = nombre;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('activo', b.dataset.vista === nombre));
    
    const titulos = {
      dashboard: 'Inicio',
      ventas: 'Ventas',
      inventario: 'Inventario',
      clientes: 'Clientes',
      cortes: 'Cortes de caja',
      reportes: 'Reportes'
    };
    
    const tituloElem = document.getElementById('titulo-vista');
    if (tituloElem) tituloElem.textContent = titulos[nombre] || '';
    
    const zona = document.getElementById('zona-vista');
    if (!zona) return;
    
    zona.innerHTML = '';
    
    if (window.Vistas && typeof window.Vistas[nombre] === 'function') {
      window.Vistas[nombre](zona);
    } else {
      zona.innerHTML = `<div class="alerta">La vista "${nombre}" aún no está disponible.</div>`;
    }
  }
};

// --- Utilidades compartidas ---
const U = {
  money(n) { 
    return '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
  },
  kg(n) { 
    return (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg'; 
  },
  hoyISO() { 
    return new Date().toISOString().slice(0, 10); 
  },
  esHoy(fechaISO) { 
    return (fechaISO || '').slice(0, 10) === this.hoyISO(); 
  },
  fechaLegible(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
           d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  },
  uid() { 
    return Date.now() + '_' + Math.random().toString(36).slice(2, 8); 
  },
  iconoEditar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  iconoBorrar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  iconoVacio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>`,

  abrirModal(titulo, cuerpoHTML, botonesHTML) {
    const root = document.getElementById('modal-root');
    if (!root) return () => {};
    root.innerHTML = `
      <div class="overlay-modal" id="overlay-modal-actual">
        <div class="modal">
          <div class="modal-header">
            <h3>${titulo}</h3>
            <button class="modal-cerrar" id="btn-cerrar-modal">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">${cuerpoHTML}</div>
          <div class="modal-footer">${botonesHTML}</div>
        </div>
      </div>`;
    const cerrar = () => { root.innerHTML = ''; };
    document.getElementById('btn-cerrar-modal')?.addEventListener('click', cerrar);
    document.getElementById('overlay-modal-actual')?.addEventListener('click', (e) => {
      if (e.target.id === 'overlay-modal-actual') cerrar();
    });
    return cerrar;
  },

  cerrarModal() { 
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = ''; 
  }
};

// Esperar correctamente la inicialización de DB
const DB_ready = (async () => {
  if (window.DB && typeof window.DB.init === 'function') {
    await window.DB.init();
  }
  return true;
})();

document.addEventListener('DOMContentLoaded', () => App.init());

// Registrar Service Worker para funcionamiento offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}