import React from 'react';
import { AlertTriangle, Save, LogOut, X } from 'lucide-react';

interface UnsavedChangesPromptModalProps {
  isOpen: boolean;
  fileName: string;
  onClose: () => void;
  onSaveAndConfirm: () => void;
  onDiscardAndConfirm: () => void;
  title?: string;
  description?: string;
}

export const UnsavedChangesPromptModal: React.FC<UnsavedChangesPromptModalProps> = ({
  isOpen,
  fileName,
  onClose,
  onSaveAndConfirm,
  onDiscardAndConfirm,
  title = '¿Guardar cambios antes de salir?',
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-md w-full overflow-hidden">
        {/* Top Warning Strip */}
        <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-2.5 font-extrabold text-base sm:text-lg">
            <AlertTriangle className="w-6 h-6 text-slate-950 shrink-0" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-600 text-slate-950 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {description || (
              <>
                Has realizado modificaciones en la base de datos{' '}
                <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                  {fileName || 'actual'}
                </strong>{' '}
                que aún no se han guardado en el archivo. Si sales o cierras sin guardar, se perderá la última modificación.
              </>
            )}
          </p>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold text-amber-700">💡 Nota:</span>
            <span>
              Al pulsar <strong>Guardar y Continuar</strong>, tu archivo quedará completamente actualizado en tu disco o pendrive.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row-reverse items-stretch gap-2">
            <button
              type="button"
              id="btn-save-and-close"
              onClick={onSaveAndConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>

            <button
              type="button"
              id="btn-discard-and-close"
              onClick={onDiscardAndConfirm}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold text-xs sm:text-sm border border-slate-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Salir sin guardar</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
            >
              Cancelar y seguir trabajando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
