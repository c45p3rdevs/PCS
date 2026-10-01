// db.js — Capa de datos local (IndexedDB). Todo vive en el dispositivo, sin red.
const DB_NAME = 'carniceria_db';
const DB_VERSION = 1;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('productos')) {
        const s = db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('nombre', 'nombre', { unique: false });
      }
      if (!db.objectStoreNames.contains('ventas')) {
        const s = db.createObjectStore('ventas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fecha', 'fecha', { unique: false });
        s.createIndex('clienteId', 'clienteId', { unique: false });
      }
      if (!db.objectStoreNames.contains('clientes')) {
        const s = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('nombre', 'nombre', { unique: false });
      }
      if (!db.objectStoreNames.contains('cortes')) {
        db.createObjectStore('cortes', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('usuarios')) {
        const s = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
        s.createIndex('usuario', 'usuario', { unique: true });
      }
      if (!db.objectStoreNames.contains('movimientos')) {
        // Historial de entradas/salidas de inventario (auditoría de stock)
        const s = db.createObjectStore('movimientos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('productoId', 'productoId', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
    };

    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  // --- CRUD genérico ---
  async add(store, obj) {
    const s = await tx(store, 'readwrite');
    return new Promise((res, rej) => {
      const r = s.add(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async put(store, obj) {
    const s = await tx(store, 'readwrite');
    return new Promise((res, rej) => {
      const r = s.put(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async get(store, id) {
    const s = await tx(store);
    return new Promise((res, rej) => {
      const r = s.get(id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async getAll(store) {
    const s = await tx(store);
    return new Promise((res, rej) => {
      const r = s.getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async delete(store, id) {
    const s = await tx(store, 'readwrite');
    return new Promise((res, rej) => {
      const r = s.delete(id);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  },
  async count(store) {
    const s = await tx(store);
    return new Promise((res, rej) => {
      const r = s.count();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async clearAll() {
    const db = await openDB();
    const names = ['productos','ventas','clientes','cortes','usuarios','movimientos'];
    for (const n of names) {
      await new Promise((res, rej) => {
        const s = db.transaction(n, 'readwrite').objectStore(n);
        const r = s.clear();
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    }
  }
};

window.DB = DB;
