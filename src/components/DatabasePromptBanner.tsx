import React from 'react';
import { Database, FolderOpen, PlusCircle, Sparkles, HardDrive, ShieldCheck } from 'lucide-react';

interface DatabasePromptBannerProps {
  onSelectExisting: () => void;
  onOpenModal: () => void;
  onCreateSample: () => void;
}

export const DatabasePromptBanner: React.FC<DatabasePromptBannerProps> = ({
  onSelectExisting,
  onOpenModal,
  onCreateSample,
}) => {
  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
      {/* Background accent glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Base de Datos Portátil Externa
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
              <ShieldCheck className="w-3 h-3" /> Sin dependencia del navegador
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
            Selecciona tu archivo de base de datos para comenzar
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            La aplicación funciona exclusivamente con un archivo único portátil (ej: <code className="text-amber-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">inventario.db</code> o <code className="text-amber-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">inventario.json</code>). Todos tus productos, movimientos de stock e instalaciones se leerán y guardarán automáticamente en ese archivo, listo para tu pendrive.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            id="btn-banner-select-db"
            onClick={onSelectExisting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Seleccionar base de datos</span>
          </button>

          <button
            type="button"
            id="btn-banner-create-empty"
            onClick={onOpenModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Crear nueva</span>
          </button>

          <button
            type="button"
            id="btn-banner-sample-data"
            onClick={onCreateSample}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 font-semibold text-xs sm:text-sm border border-amber-500/30 transition cursor-pointer"
            title="Carga una base de datos de ejemplo con materiales de energía solar para probar de inmediato"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Probar con datos demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
