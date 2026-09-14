/**
 * Utilities for portable external database file handling
 * Supports File System Access API (Chromium) and HTML5 File Input fallback
 */

export interface PickFileResult {
  file: File;
  handle: FileSystemFileHandle | null;
}

/**
 * Verify or request readwrite permission for a FileSystemFileHandle
 */
export async function verifyPermission(
  fileHandle: any,
  readWrite: boolean = true
): Promise<boolean> {
  if (!fileHandle) return false;
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  try {
    if (typeof fileHandle.queryPermission === 'function') {
      const state = await fileHandle.queryPermission(options);
      if (state === 'granted') {
        return true;
      }
    }
    if (typeof fileHandle.requestPermission === 'function') {
      const requestedState = await fileHandle.requestPermission(options);
      return requestedState === 'granted';
    }
  } catch (err) {
    console.warn('Error verificando permisos de archivo:', err);
  }
  return false;
}

/**
 * Prompt user to select an existing portable database file (.json or .db)
 * Fixed MIME-type mapping without duplicate file extensions across types to prevent browser TypeError
 */
export async function pickDatabaseFile(
  fileInputFallback?: HTMLInputElement | null
): Promise<PickFileResult | null> {
  // Try File System Access API if available
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Base de datos de inventario (*.json, *.db)',
            accept: {
              'application/json': ['.json'],
              'application/octet-stream': ['.db', '.sqlite'],
              'text/plain': ['.txt'],
            },
          },
        ],
        multiple: false,
      });

      if (handle) {
        // Request write permission upfront while inside the user click gesture
        await verifyPermission(handle, true);
        const file = await handle.getFile();
        return { file, handle };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.warn('showOpenFilePicker no disponible o denegado, usando selector estándar:', err);
    }
  }

  // Fallback to HTML input if handle not supported or blocked
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

  return null;
}

/**
 * Prompt user to create or select a file to save/overwrite on disk (returns handle)
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
      }
      return handle;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.warn('showSaveFilePicker error o cancelado:', err);
    }
  }
  return null;
}

/**
 * Triggers browser download of a database blob (for pendrive / email)
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
