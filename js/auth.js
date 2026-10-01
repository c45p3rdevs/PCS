// auth.js — Login local simple. La contraseña se guarda hasheada (SHA-256), nunca en texto plano.
const Auth = {
  SESSION_KEY: 'carniceria_sesion',

  async hash(texto) {
    const enc = new TextEncoder().encode(texto);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hayUsuarios() {
    const total = await DB.count('usuarios');
    return total > 0;
  },

  async crearUsuario(usuario, password, nombre) {
    const passHash = await this.hash(password);
    return DB.add('usuarios', { usuario, passHash, nombre, creado: new Date().toISOString() });
  },

  async login(usuario, password) {
    const todos = await DB.getAll('usuarios');
    const u = todos.find(x => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    if (!u) return { ok: false, error: 'Usuario no encontrado' };
    const passHash = await this.hash(password);
    if (passHash !== u.passHash) return { ok: false, error: 'Contraseña incorrecta' };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ id: u.id, usuario: u.usuario, nombre: u.nombre }));
    return { ok: true, user: u };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  sesionActual() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }
};

window.Auth = Auth;
