// auth.js — Login local simple. La contraseña se guarda hasheada (SHA-256), nunca en texto plano.
const Auth = {
  SESSION_KEY: 'carniceria_sesion',

  async hash(texto) {
    const enc = new TextEncoder().encode(texto);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hayUsuarios() {
    try {
      if (!window.DB) return false;
      const total = await DB.count('usuarios');
      return total > 0;
    } catch (e) {
      console.error('Error verificando usuarios:', e);
      return false;
    }
  },

  async crearUsuario(usuario, password, nombre) {
    if (!usuario || !password) {
      return { ok: false, error: 'Usuario y contraseña obligatorios' };
    }
    
    // Validar si el usuario ya existe
    const todos = await DB.getAll('usuarios');
    const existe = todos.some(x => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    if (existe) {
      return { ok: false, error: 'El nombre de usuario ya está registrado' };
    }

    const passHash = await this.hash(password);
    await DB.add('usuarios', { 
      usuario: usuario.trim(), 
      passHash, 
      nombre: nombre ? nombre.trim() : usuario.trim(), 
      creado: new Date().toISOString() 
    });
    
    return { ok: true };
  },

  async login(usuario, password) {
    if (!usuario || !password) {
      return { ok: false, error: 'Ingrese usuario y contraseña' };
    }

    const todos = await DB.getAll('usuarios');
    const u = todos.find(x => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    
    if (!u) return { ok: false, error: 'Usuario no encontrado' };
    
    const passHash = await this.hash(password);
    if (passHash !== u.passHash) return { ok: false, error: 'Contraseña incorrecta' };
    
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ 
      id: u.id, 
      usuario: u.usuario, 
      nombre: u.nombre 
    }));
    
    return { ok: true, user: u };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  sesionActual() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
};

window.Auth = Auth;