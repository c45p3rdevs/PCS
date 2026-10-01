// auth.js — Login local simple. La contraseña se guarda hasheada (SHA-256), nunca en texto plano.
const Auth = {
  SESSION_KEY: 'carniceria_sesion',

  async hash(texto) {
    // Si la API crypto.subtle está disponible (HTTPS o localhost)
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder().encode(texto);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback para red local en HTTP (soluciona el error 'Cannot read properties of undefined (reading digest)')
    return this.sha256Fallback(texto);
  },

  // Algoritmo SHA-256 en JS puro para redes locales bajo HTTP
  sha256Fallback(ascii) {
    function mathPow(n) { return Math.pow(n, 1/3); }
    const K = [], maxWord = Math.pow(2, 32);
    let i = 0, lengthProperty = 'length', result = '';
    const words = [], asciiBitLength = ascii[lengthProperty] * 8;
    let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    let isComposite = {};
    for (let candidate = 2; i < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let j = 0; j < 313; j += candidate) isComposite[j] = true;
        K[i] = (mathPow(candidate) * maxWord) | 0;
        i++;
      }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      let j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (let j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + K[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j >= 0; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;

    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
  },

  async hayUsuarios() {
    try {
      if (!window.DB) return false;
      const total = await DB.count('usuarios');
      return total > 0;
    } catch (e) {
      console.error('Error al contar usuarios:', e);
      return false;
    }
  },

  async crearUsuario(usuario, password, nombre) {
    if (!usuario || !password) {
      return { ok: false, error: 'Usuario y contraseña obligatorios' };
    }

    try {
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
    } catch (e) {
      return { ok: false, error: e.message || 'Error al guardar el usuario en base de datos' };
    }
  },

  async login(usuario, password) {
    if (!usuario || !password) {
      return { ok: false, error: 'Ingrese usuario y contraseña' };
    }

    try {
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
    } catch (e) {
      return { ok: false, error: e.message || 'Error de autenticación' };
    }
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