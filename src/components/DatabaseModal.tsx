import React, { useState } from 'react';
import {
  Database,
  FolderOpen,
  PlusCircle,
  Download,
  Sparkles,
  CheckCircle2,
  HardDrive,
  FileCheck,
  X,
  RefreshCw,
  LogOut,
  Save,
  AlertTriangle,
  FolderSync
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  downloadDatabaseBlob,
  pickDatabaseFile,
  createDatabaseFileHandle,
  pickDatabaseDirectory
} from '../utils/fileDatabase';
import { formatDateTime } from '../utils/formatters';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onShowToast: (text: string, type?: 'success' | 'warning' | 'info') => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  fileInputRef,
  onShowToast,
}) => {
  const [newFileName, setNewFileName] = useState('inventario.json');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isLoaded = dbService.isLoaded();
  const dbFileName = dbService.getDatabaseFileName();
  const lastSavedAt = dbService.getLastSavedAt();
  const saveStatus = dbService.getSaveStatus();
  const hasWritable = dbService.hasWritableHandle();
  const productsCount = dbService.getProducts().length;
  const movementsCount = dbService.getMovements().length;
  const templatesCount = dbService.getTemplates().length;
  const dbPath = dbService.getDbPath();
  const nextInvoiceNumber = dbService.getNextInvoiceNumber();

  const handleSelectExisting = async () => {
    setIsLoading(true);
    try {
      const result = await pickDatabaseFile(fileInputRef.current);
      if (result) {
        const loadResult = await dbService.loadFromFile(result.file, result.handle);
        if (loadResult.success) {
          onShowToast(
            `Base de datos "${result.file.name}" cargada correctamente (${loadResult.stats?.products || 0} productos)`,
            'success'
          );
          onClose();
        } else {
          onShowToast(loadResult.message || 'Error al leer el archivo', 'warning');
        }
      }
    } catch (err: any) {
      console.error('Error al seleccionar base de datos', err);
      onShowToast('No se pudo abrir el archivo seleccionado', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmpty = async () => {
    if (!newFileName.trim()) return;
    setIsLoading(true);
    try {
      // Try obtaining a writable file handle via save file picker if supported
      const handle = await createDatabaseFileHandle(newFileName.trim());
      await dbService.createNewDatabase(newFileName.trim(), false, handle);

      onShowToast(`Nueva base de datos "${newFileName}" creada y conectada`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Error al crear base de datos', err);
      onShowToast('Error al crear el archivo de base de datos', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWithSampleData = async () => {
    setIsLoading(true);
    try {
      const suggestedName = 'inventario_solar.json';
      const handle = await createDatabaseFileHandle(suggestedName);
      await dbService.createNewDatabase(suggestedName, true, handle);

      onShowToast(`Base de datos de demostración cargada con productos y movimientos`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Error al crear demo', err);
      onShowToast('Error al generar la base de datos de demostración', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCopy = () => {
    const { blob, fileName } = dbService.exportDatabaseAsBlob();
    downloadDatabaseBlob(blob, fileName);
    onShowToast(`Archivo "${fileName}" descargado listo para pendrive o correo`, 'success');
  };

  const handleBindWritableHandle = async () => {
    const targetName = dbFileName || 'inventario.json';
    try {
      const handle = await createDatabaseFileHandle(targetName);
      if (handle) {
        dbService.setFileHandle(handle);
        await dbService.saveToFile();
        onShowToast(`Archivo "${handle.name}" vinculado para guardado directo continuo`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFolder = async () => {
    const targetName = dbFileName || 'inventario.json';
    try {
      const dirResult = await pickDatabaseDirectory(targetName);
      if (dirResult && dirResult.fileHandle) {
        dbService.setFileHandle(dirResult.fileHandle);
        await dbService.saveToFile();
        onShowToast(`Carpeta vinculada: escribiendo en "${dirResult.fileHandle.name}"`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Deseas cerrar la base de datos actual? Tus datos seguirán guardados en la aplicación para cuando vuelvas.')) {
      dbService.disconnectDatabase(false);
      onShowToast('Base de datos guardada', 'info');
      onClose();
    }
  };

  const handleSaveDatabaseNow = async () => {
    const res = await dbService.saveCurrentDatabase();
    onShowToast(res.message, res.success ? 'success' : 'warning');
  };

  const hasUnsaved = dbService.hasUnsavedChanges();

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Base de Datos Portátil Externa</h3>
              <p className="text-xs text-slate-400">
                Archivo independiente (.db o .json) para pendrive, correo o copias de seguridad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Active Database Status Card */}
          <div className={`p-4 rounded-xl border ${
            isLoaded 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Estado de conexión
                </span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isLoaded ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {isLoaded ? dbFileName : 'Ninguna base de datos seleccionada'}
                  </span>
                </div>
              </div>

              {isLoaded && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hasWritable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {hasWritable ? 'Guardado directo en archivo' : 'Guardado automático activo'}
                </span>
              )}
            </div>

            {isLoaded ? (
              <div className="mt-3 pt-3 border-t border-emerald-100/80 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="text-slate-400 text-[10px] block">Productos</span>
                    <strong className="text-slate-900 font-mono text-sm">{productsCount}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="text-slate-400 text-[10px] block">Movimientos</span>
                    <strong className="text-slate-900 font-mono text-sm">{movementsCount}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="text-slate-400 text-[10px] block">Plantillas</span>
                    <strong className="text-slate-900 font-mono text-sm">{templatesCount}</strong>
                  </div>
                </div>

                {/* Ruta persistente y consecutivo de factura */}
                <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-700">Ruta / Archivo recordado:</span>
                    <span className="font-mono text-emerald-800 font-bold max-w-[260px] truncate" title={dbPath || dbFileName || ''}>
                      {dbPath || dbFileName || 'inventario.json'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 border-t border-slate-100 pt-1">
                    <span className="font-semibold text-slate-700">Siguiente consecutivo factura:</span>
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {nextInvoiceNumber}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                  <span>
                    {lastSavedAt ? `Último guardado: ${formatDateTime(lastSavedAt.toISOString())}` : 'Sin cambios recientes'}
                  </span>
                  {saveStatus === 'saving' && (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Guardando en archivo...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Todo sincronizado
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    id="btn-modal-save-database"
                    onClick={handleSaveDatabaseNow}
                    className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer text-xs ${
                      hasUnsaved
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{hasUnsaved ? 'Guardar cambios ahora' : 'Base de datos guardada'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCopy}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar copia para Pendrive</span>
                  </button>

                  {!hasWritable && (
                    <>
                      <button
                        type="button"
                        onClick={handleBindWritableHandle}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
                        title="Elige dónde guardar con showSaveFilePicker para recordar el archivo y escribir directamente en él"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Vincular archivo directo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
                        title="Elige una carpeta con showDirectoryPicker para guardar y actualizar el archivo dentro de ella"
                      >
                        <FolderSync className="w-3.5 h-3.5" />
                        <span>Vincular carpeta</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2.5 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-auto flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                Para comenzar a gestionar tu inventario y stock, selecciona un archivo existente de tu ordenador o pendrive, o crea uno nuevo a continuación.
              </p>
            )}
          </div>

          {/* Action 1: Seleccionar base de datos existente */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Abrir Base de Datos Existente (.db / .json)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Elige un archivo guardado en tu pendrive o disco duro
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-modal-open-file"
                disabled={isLoading}
                onClick={handleSelectExisting}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Abriendo...' : 'Seleccionar Archivo'}</span>
              </button>
            </div>
          </div>

          {/* Action 2: Crear nueva base de datos vacía */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Crear Nueva Base de Datos Vacía
                </h4>
                <p className="text-[11px] text-slate-500">
                  Comienza desde cero con un archivo limpio para tu empresa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Nombre del archivo (ej: inventario.json o inventario.db)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                id="btn-modal-create-empty"
                disabled={isLoading || !newFileName.trim()}
                onClick={handleCreateEmpty}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                Crear Archivo
              </button>
            </div>
          </div>

          {/* Action 3: Crear con datos de demostración */}
          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-900">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Crear con Datos de Ejemplo (Demostración)
                </h4>
                <p className="text-[11px] text-amber-800">
                  Genera un archivo portátil con paneles, inversores, kits y movimientos reales
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-modal-create-sample"
              disabled={isLoading}
              onClick={handleCreateWithSampleData}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
            >
              Usar Ejemplo
            </button>
          </div>

          {/* Information footer note */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>100% Portátil:</strong> Puedes copiar tu archivo a un pendrive USB, guardarlo en Google Drive o enviarlo por email a otro compañero. Al abrir la app en cualquier otro ordenador y elegir ese archivo, verá todos los datos actualizados.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
