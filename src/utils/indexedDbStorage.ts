/**
 * Almacenamiento local interno con IndexedDB
 * Permite que dentro de la aplicación o APK la base de datos en uso
 * se mantenga siempre modificada y actualizada en tiempo real sin perder datos.
 */

const DB_NAME = 'InventarioStockAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'activeDatabase';

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
  });
}

export async function saveActiveDatabaseToIndexedDb(
  fileName: string,
  data: any
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: 'current_in_use',
        fileName,
        data,
        updatedAt: new Date().toISOString(),
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('No se pudo guardar en IndexedDB:', err);
    return false;
  }
}

export async function loadActiveDatabaseFromIndexedDb(): Promise<{
  fileName: string;
  data: any;
  updatedAt: string;
} | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_in_use');

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve({
            fileName: req.result.fileName,
            data: req.result.data,
            updatedAt: req.result.updatedAt,
          });
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('No se pudo leer de IndexedDB:', err);
    return null;
  }
}

export async function clearActiveDatabaseInIndexedDb(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('current_in_use');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('No se pudo limpiar IndexedDB:', err);
  }
}
