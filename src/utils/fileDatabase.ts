/**
 * Utilidades para el manejo de archivos portátiles (.json).
 * Notas:
 *  - NO se usa showOpenFilePicker (bloqueado en iframes).
 *  - showSaveFilePicker se usa para obtener un handle escribible persistente.
 *  - Los permisos se cachean para no disparar prompts al navegador en bucle.
 */

export interface PickFileResult {
  file: File;
  handle: FileSystemFileHandle | null;
}

// Cache de permisos por handle (evita llamar a queryPermission mil veces)
const permissionCache = new WeakMap<object, 'granted' | 'denied' | 'prompt'>();

export async function verifyPermission(
  handle: any,
  readWrite: boolean = true
): Promise<boolean> {
  if (!handle) return false;

  const options: any = readWrite ? { mode: 'readwrite' } : {};

  // 1. Cache rápido
  const cached = permissionCache.get(handle);
  if (cached === 'granted') return true;

  try {
    if (typeof handle.queryPermission === 'function') {
      const state = await handle.queryPermission(options);
      if (state === 'granted') {
        permissionCache.set(handle, 'granted');
        return true;
      }
      if (state === 'denied') {
        permissionCache.set(handle, 'denied');
        return false;
      }
    }

    // state === 'prompt' → pedir al usuario
    if (typeof handle.requestPermission === 'function') {
      const requested = await handle.requestPermission(options);
      if (requested === 'granted') {
        permissionCache.set(handle, 'granted');
        return true;
      }
      permissionCache.set(handle, 'denied');
      return false;
    }
  } catch (err) {
    console.warn('Error verificando permisos:', err);
  }
  return false;
}

export async function pickDatabaseFile(
  fileInputFallback?: HTMLInputElement | null
): Promise<PickFileResult | null> {
  if (fileInputFallback) {
    return new Promise((resolve) => {
      const handleChange = (e: Event) => {
        fileInputFallback.removeEventListener('change', handleChange);
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) resolve({ file: files[0], handle: null });
        else resolve(null);
      };
      fileInputFallback.addEventListener('change', handleChange);
      fileInputFallback.click();
    });
  }

  return new Promise((resolve) => {
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = '.json,.db,.sqlite,application/json';
    tempInput.style.display = 'none';
    document.body.appendChild(tempInput);

    const cleanup = () => {
      if (tempInput.parentNode) document.body.removeChild(tempInput);
    };

    tempInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        cleanup();
        resolve({ file, handle: null });
      } else {
        cleanup();
        resolve(null);
      }
    });

    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!tempInput.files || tempInput.files.length === 0) {
            cleanup();
            resolve(null);
          }
        }, 800);
      },
      { once: true }
    );

    tempInput.click();
  });
}

export async function createDatabaseFileHandle(
  suggestedName: string = 'inventario.json'
): Promise<FileSystemFileHandle | null> {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const isBinary = suggestedName.endsWith('.db') || suggestedName.endsWith('.sqlite');
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: isBinary ? 'Base de datos (*.db)' : 'Base de datos (*.json)',
            accept: isBinary
              ? { 'application/octet-stream': ['.db'] }
              : { 'application/json': ['.json'] },
          },
        ],
      });
      if (handle) {
        await verifyPermission(handle, true);
        return handle;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('showSaveFilePicker no disponible o cancelado:', err);
    }
  }
  return null;
}

export async function pickDatabaseDirectory(
  databaseFileName: string = 'inventario.json'
): Promise<{ dirHandle: any; fileHandle: FileSystemFileHandle } | null> {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (dirHandle) {
        await verifyPermission(dirHandle, true);
        const fileHandle = await dirHandle.getFileHandle(databaseFileName, { create: true });
        if (fileHandle) {
          await verifyPermission(fileHandle, true);
          return { dirHandle, fileHandle };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('showDirectoryPicker no disponible o cancelado:', err);
    }
  }
  return null;
}

export function downloadDatabaseBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}