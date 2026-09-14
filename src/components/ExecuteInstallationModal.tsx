import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { InstallationTemplate, Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ExecuteInstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: InstallationTemplate[];
  products: Product[];
  initialTemplateId?: string;
  onConfirmExecution: (params: {
    plantillaId?: string;
    plantillaNombre?: string;
    motivo: string;
    cliente?: string;
    items: { productoId: string; cantidad: number }[];
    observaciones?: string;
  }) => void;
}

export const ExecuteInstallationModal: React.FC<ExecuteInstallationModalProps> = ({
  isOpen,
  onClose,
  templates,
  products,
  initialTemplateId,
  onConfirmExecution,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [motivo, setMotivo] = useState('Instalación cliente Pérez');
  const [cliente, setCliente] = useState('Cliente Pérez');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<{ productoId: string; cantidad: number }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTemplateId && templates.some((t) => t.id === initialTemplateId)) {
      setSelectedTemplateId(initialTemplateId);
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [initialTemplateId, templates, isOpen]);

  // When template changes, load its items
  useEffect(() => {
    if (selectedTemplateId) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl) {
        setItems(tpl.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })));
        if (!motivo || motivo === 'Instalación cliente Pérez') {
          setMotivo(cliente ? `Instalación ${cliente}` : `Instalación ${tpl.nombre}`);
        }
      }
    }
  }, [selectedTemplateId, templates]);

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Financial calculations
  let costoTotal = 0;
  let ingresoTotal = 0;
  let hasStockShortage = false;

  const enrichedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productoId);
    const subCosto = prod ? item.cantidad * prod.precioCompra : 0;
    const subIngreso = prod ? item.cantidad * prod.precioVenta : 0;
    const stockActual = prod ? prod.stockActual : 0;
    const isSufficient = stockActual >= item.cantidad;

    if (!isSufficient) hasStockShortage = true;

    costoTotal += subCosto;
    ingresoTotal += subIngreso;

    return {
      ...item,
      producto: prod,
      subCosto,
      subIngreso,
      stockActual,
      isSufficient,
    };
  });

  const gananciaTotal = ingresoTotal - costoTotal;

  const handleUpdateQty = (index: number, qty: number) => {
    if (qty < 0) return;
    const updated = [...items];
    updated[index].cantidad = qty;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!motivo.trim()) {
      setError('Debes especificar el motivo del movimiento (ejemplo: "Instalación cliente Pérez").');
      return;
    }

    if (items.length === 0 || items.every((i) => i.cantidad <= 0)) {
      setError('Debes incluir al menos un producto con cantidad mayor a cero.');
      return;
    }

    if (hasStockShortage) {
      const confirmWarning = confirm(
        'Atención: Uno o más productos superan el stock disponible en almacén. ¿Deseas ejecutar la instalación de todos modos y registrar el stock en negativo o pendiente de reposición?'
      );
      if (!confirmWarning) return;
    }

    onConfirmExecution({
      plantillaId: currentTemplate?.id,
      plantillaNombre: currentTemplate?.nombre,
      motivo: motivo.trim(),
      cliente: cliente.trim() || undefined,
      items: items.filter((i) => i.cantidad > 0),
      observaciones: observaciones.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Registrar Instalación en Cliente</h3>
              <p className="text-xs text-emerald-200">
                Descuenta automáticamente del stock y registra fecha, hora y ganancia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plantilla Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plantilla de Instalación Base
            </label>
            <select
              id="select-installation-template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.items.length} componentes)
                </option>
              ))}
            </select>
          </div>

          {/* Motivo del Movimiento (Required per spec) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo del Movimiento *
              </label>
              <input
                id="input-installation-motivo"
                type="text"
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Instalación cliente Pérez"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Se guardará con fecha y hora exacta en el registro
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente / Dirección
              </label>
              <input
                id="input-installation-cliente"
                type="text"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  if (e.target.value) {
                    setMotivo(`Instalación cliente ${e.target.value}`);
                  }
                }}
                placeholder="Ej: Pérez / Finca El Roble"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Items a descontar del stock */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Materiales a descontar del inventario
              </span>
              <span className="text-xs text-slate-500">
                {enrichedItems.length} productos incluidos
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {enrichedItems.map((item, index) => (
                <div key={item.productoId} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-slate-900 truncate">
                      {item.producto?.nombre || 'Producto desconocido'}
                    </h5>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>Stock en almacén: <strong>{item.stockActual}</strong> {item.producto?.unidadMedida || 'ud'}</span>
                      <span>PVP: {formatCurrency(item.producto?.precioVenta || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateQty(index, Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded border border-slate-300 text-xs font-bold text-center"
                        />
                        <span className="text-xs text-slate-500">{item.producto?.unidadMedida || 'ud'}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                        {formatCurrency(item.subIngreso)}
                      </span>
                    </div>

                    <div className="w-6 text-center">
                      {item.isSufficient ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" title="Stock suficiente" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" title={`Faltan ${item.cantidad - item.stockActual} unidades`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasStockShortage && (
              <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 border-t border-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Uno o más productos tienen stock insuficiente para esta instalación.</span>
              </div>
            )}
          </div>

          {/* Resumen de Ganancia Instantánea */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                  Ganancia de esta Instalación
                </span>
                <span className="text-xs text-emerald-700">
                  Ingreso venta ({formatCurrency(ingresoTotal)}) - Coste compra ({formatCurrency(costoTotal)})
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black text-emerald-700 font-mono">
                +{formatCurrency(gananciaTotal)}
              </span>
              <span className="text-xs text-emerald-600 block font-semibold">
                Margen: {ingresoTotal > 0 ? Math.round((gananciaTotal / ingresoTotal) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observaciones del Trabajo (Opcional)
            </label>
            <input
              id="input-installation-obs"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Instalación completada y verificada, cliente conforme..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirm-execute-installation"
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm flex items-center gap-2 transition active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              <span>Confirmar y Descontar Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
