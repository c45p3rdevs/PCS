// app.js — Lógica principal: sesión, navegación y utilidades compartidas.
// Las vistas específicas (inventario, ventas, clientes, cortes) están en sus propios archivos.

const App = {
  vistaActual: 'dashboard',

  async init() {
    await DB_ready;
    const hay = await Auth.hayUsuarios();
    document.getElementById('pantalla-carga').classList.add('oculto');

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
    document.getElementById('vista-login').classList.remove('oculto');
    document.getElementById('app-shell').classList.add('oculto');
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
    document.getElementById('form-login').addEventListener('submit', async (e) => {
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

    // Formulario de Registro (Corregido y robustecido)
    document.getElementById('form-registro').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('reg-nombre').value.trim();
      const usuario = document.getElementById('reg-usuario').value.trim();
      const password = document.getElementById('reg-password').value;
      const msg = document.getElementById('mensaje-login');
      msg.innerHTML = '';

      try {
        // 1. Crear el usuario en IndexedDB
        await Auth.crearUsuario(usuario, password, nombre);
        
        // 2. Realizar login inmediato 
        const r = await Auth.login(usuario, password);
        
        if (r.ok) {
          // 3. Recarga limpia del sistema para inicializar la PWA con la sesión activa
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
    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
      Auth.logout();
      location.reload();
    });
  },

  mostrarApp(sesion) {
    document.getElementById('vista-login').classList.add('oculto');
    document.getElementById('app-shell').classList.remove('oculto');
    document.getElementById('nombre-usuario-actual').textContent = sesion.nombre || sesion.usuario;
    document.getElementById('avatar-usuario-actual').textContent = (sesion.nombre || sesion.usuario).slice(0,1).toUpperCase();
    this.irVista('dashboard');
  },

  irVista(nombre) {
    this.vistaActual = nombre;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('activo', b.dataset.vista === nombre));
    // SE AGREGA 'reportes' AL OBJETO DE TITULOS:
    const titulos = { dashboard: 'Inicio', ventas: 'Ventas', inventario: 'Inventario', clientes: 'Clientes', cortes: 'Cortes de caja', reportes: 'Reportes' };
    document.getElementById('titulo-vista').textContent = titulos[nombre] || '';
    const zona = document.getElementById('zona-vista');
    zona.innerHTML = '';
    if (nombre === 'dashboard') Vistas.dashboard(zona);
    if (nombre === 'ventas') Vistas.ventas(zona);
    if (nombre === 'inventario') Vistas.inventario(zona);
    if (nombre === 'clientes') Vistas.clientes(zona);
    if (nombre === 'cortes') Vistas.cortes(zona);
    // SE AGREGA LA CONDICIONAL DE LLAMADO PARA REPORTES:
    if (nombre === 'reportes') Vistas.reportes(zona);
  }
};

// --- Utilidades compartidas ---
const U = {
  money(n) { return '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  kg(n) { return (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg'; },
  hoyISO() { return new Date().toISOString().slice(0,10); },
  esHoy(fechaISO) { return (fechaISO || '').slice(0,10) === this.hoyISO(); },
  fechaLegible(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
           d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  },
  uid() { return Date.now() + '_' + Math.random().toString(36).slice(2,8); },
  iconoEditar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  iconoBorrar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  iconoVacio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>`,

  abrirModal(titulo, cuerpoHTML, botonesHTML) {
    const root = document.getElementById('modal-root');
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
    const cerrar = () => root.innerHTML = '';
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrar);
    document.getElementById('overlay-modal-actual').addEventListener('click', (e) => {
      if (e.target.id === 'overlay-modal-actual') cerrar();
    });
    return cerrar;
  },

  cerrarModal() { document.getElementById('modal-root').innerHTML = ''; }
};

// Señal de que la base de datos ya abrió, para no correr operaciones antes de tiempo
const DB_ready = (async () => { await new Promise(r => setTimeout(r, 0)); return true; })();

document.addEventListener('DOMContentLoaded', () => App.init());

// Registrar Service Worker para funcionamiento offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}