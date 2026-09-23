import React, { useState, useEffect } from 'react';
import { X, Save, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CompanyInfo } from '../types';
import { dbService } from '../services/db';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [nombre, setNombre] = useState('');
  const [cif, setCif] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Cargar los datos actuales al abrir
  useEffect(() => {
    if (!isOpen) return;
    const empresa = dbService.getEmpresa();
    setNombre(empresa.nombre || '');
    setCif(empresa.cif || '');
    setDireccion(empresa.direccion || '');
    setTelefono(empresa.telefono || '');
    setEmail(empresa.email || '');
    setError('');
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre de la empresa es obligatorio (aparece en la factura).');
      return;
    }

    const nuevaEmpresa: CompanyInfo = {
      nombre: nombre.trim(),
      cif: cif.trim() || undefined,
      direccion: direccion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
    };

    dbService.setEmpresa(nuevaEmpresa);
    onShowToast?.('Datos de empresa guardados correctamente.', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[60] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Editar Datos de Empresa
              </h3>
              <p className="text-xs text-slate-400">
                Aparecen en la cabecera de todas las facturas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre de la Empresa *
              </label>
              <input
                id="input-company-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Danos Electrical"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* CIF + Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CIF / NIF
                </label>
                <input
                  id="input-company-cif"
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono
                </label>
                <input
                  id="input-company-telefono"
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +53 58101968"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dirección
              </label>
              <input
                id="input-company-direccion"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Calle 5 esq. a 12, Cienfuegos"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                id="input-company-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            {/* Nota informativa */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-[11px] text-amber-900">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Estos datos se guardan en tu archivo de base de datos y se usan en{' '}
                <strong>todas las facturas nuevas</strong>. Las facturas ya emitidas no
                cambian.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-company"
              className="px-5 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm flex items-center gap-2 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};