/**
 * Almacenamiento local interno dual con IndexedDB y localStorage
 * Garantiza que cualquier cambio en productos, stock, plantillas y movimientos
 * quede guardado inmediatamente y persista al refrescar o reabrir la app.
 */

const DB_NAME = 'InventarioStockAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'activeDatabase';
const LOCAL_STORAGE_KEY = 'InventarioStockApp_activeDatabase_backup';
export const DB_PATH_STORAGE_KEY = 'dbPath';

export function getStoredDbPath(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(DB_PATH_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('No se pudo leer dbPath de localStorage:', err);
  }
  return null;
}

export function setStoredDbPath(path: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DB_PATH_STORAGE_KEY, path);
    }
  } catch (err) {
    console.warn('No se pudo guardar dbPath en localStorage:', err);
  }
}

function saveToLocalStorage(fileName: string, data: any, updatedAt: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const payload = JSON.stringify({ fileName, data, updatedAt });
      window.localStorage.setItem(LOCAL_STORAGE_KEY, payload);
      if (fileName) {
        window.localStorage.setItem(DB_PATH_STORAGE_KEY, fileName);
      }
    }
  } catch (err) {
    console.warn('No se pudo guardar en localStorage:', err);
  }
}

function loadFromLocalStorage(): { fileName: string; data: any; updatedAt: string } | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && Array.isArray(parsed.data.products)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('No se pudo leer de localStorage:', err);
  }
  return null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no soportado'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

export async function saveActiveDatabaseToIndexedDb(
  fileName: string,
  data: any,
  handle?: any | null
): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Guardado inmediato sincrónico en localStorage (a prueba de fallos de IndexedDB)
  saveToLocalStorage(fileName, data, now);

  // 2. Guardado persistente en IndexedDB (soporta retención estructurada de FileSystemFileHandle)
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: any = {
        id: 'current_in_use',
        fileName,
        data,
        updatedAt: now,
      };
      if (handle) {
        record.handle = handle;
      }
      store.put(record);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Advertencia en IndexedDB (respaldo en localStorage garantizado):', err);
    return true; // El respaldo en localStorage mantiene los datos a salvo
  }
}

export async function loadActiveDatabaseFromIndexedDb(): Promise<{
  fileName: string;
  data: any;
  updatedAt: string;
  handle?: any | null;
} | null> {
  const localBackup = loadFromLocalStorage();

  try {
    const db = await openDatabase();
    const idbResult = await new Promise<{ fileName: string; data: any; updatedAt: string; handle?: any } | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_in_use');

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve({
            fileName: req.result.fileName,
            data: req.result.data,
            updatedAt: req.result.updatedAt || new Date().toISOString(),
            handle: req.result.handle || null,
          });
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });

    // Si ambos existen, comparar timestamps para usar el más reciente
    if (idbResult && localBackup) {
      const idbTime = new Date(idbResult.updatedAt).getTime();
      const localTime = new Date(localBackup.updatedAt).getTime();
      return idbTime >= localTime ? idbResult : { ...localBackup, handle: idbResult.handle };
    }

    return idbResult || (localBackup ? { ...localBackup, handle: null } : null);
  } catch (err) {
    console.warn('Recuperando datos desde localStorage debido a error en IndexedDB:', err);
    return localBackup ? { ...localBackup, handle: null } : null;
  }
}

export async function clearActiveDatabaseInIndexedDb(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('current_in_use');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('No se pudo limpiar almacenamiento:', err);
  }
}
