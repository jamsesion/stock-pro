/**
 * Utilities for portable external database file handling
 * Replaced showOpenFilePicker (which is blocked by cross-origin iframes) with standard HTML5 file input,
 * while utilizing showSaveFilePicker and showDirectoryPicker to establish and persist direct writable handles.
 */

export interface PickFileResult {
  file: File;
  handle: FileSystemFileHandle | null;
}

/**
 * Verify or request readwrite permission for a FileSystemFileHandle or FileSystemDirectoryHandle
 */
export async function verifyPermission(
  handle: any,
  readWrite: boolean = true
): Promise<boolean> {
  if (!handle) return false;
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  try {
    if (typeof handle.queryPermission === 'function') {
      const state = await handle.queryPermission(options);
      if (state === 'granted') {
        return true;
      }
    }
    if (typeof handle.requestPermission === 'function') {
      const requestedState = await handle.requestPermission(options);
      return requestedState === 'granted';
    }
  } catch (err) {
    console.warn('Error verificando permisos de archivo/directorio:', err);
  }
  return false;
}

/**
 * Selector estándar de archivo con <input type="file">.
 * NO utiliza showOpenFilePicker para evitar el error de iframe:
 * "Failed to execute 'showOpenFilePicker' on 'Window': Cross origin sub frames aren't allowed to show a file picker."
 */
export async function pickDatabaseFile(
  fileInputFallback?: HTMLInputElement | null
): Promise<PickFileResult | null> {
  // If an existing input element ref is provided, use it
  if (fileInputFallback) {
    return new Promise((resolve) => {
      const handleChange = (e: Event) => {
        fileInputFallback.removeEventListener('change', handleChange);
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          resolve({ file: files[0], handle: null });
        } else {
          resolve(null);
        }
      };
      fileInputFallback.addEventListener('change', handleChange);
      fileInputFallback.click();
    });
  }

  // Otherwise create a temporary standard file input element
  return new Promise((resolve) => {
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = '.json,.db,.sqlite,application/json';
    tempInput.style.display = 'none';
    document.body.appendChild(tempInput);

    const cleanup = () => {
      if (tempInput.parentNode) {
        document.body.removeChild(tempInput);
      }
    };

    tempInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const selectedFile = target.files[0];
        cleanup();
        resolve({ file: selectedFile, handle: null });
      } else {
        cleanup();
        resolve(null);
      }
    });

    // Handle cancelation or clicking away
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!tempInput.files || tempInput.files.length === 0) {
            cleanup();
            resolve(null);
          }
        }, 1000);
      },
      { once: true }
    );

    tempInput.click();
  });
}

/**
 * Permite al usuario elegir dónde guardar el archivo usando showSaveFilePicker,
 * obteniendo un FileSystemFileHandle con permisos de escritura directa para persistirlo y reutilizarlo.
 */
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
      if (err.name === 'AbortError') {
        return null;
      }
      console.warn('showSaveFilePicker no disponible o cancelado:', err);
    }
  }
  return null;
}

/**
 * Alternativa: Permite al usuario elegir una carpeta usando showDirectoryPicker
 * para guardar y leer la base de datos de manera persistente dentro de esa carpeta.
 */
export async function pickDatabaseDirectory(
  databaseFileName: string = 'inventario.json'
): Promise<{ dirHandle: any; fileHandle: FileSystemFileHandle } | null> {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      if (dirHandle) {
        await verifyPermission(dirHandle, true);
        const fileHandle = await dirHandle.getFileHandle(databaseFileName, { create: true });
        if (fileHandle) {
          await verifyPermission(fileHandle, true);
          return { dirHandle, fileHandle };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.warn('showDirectoryPicker no disponible o cancelado:', err);
    }
  }
  return null;
}

/**
 * Descarga una copia de la base de datos completa como blob (respaldo para pendrive o correo)
 */
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
