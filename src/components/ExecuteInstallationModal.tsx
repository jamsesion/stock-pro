import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Trash2,
  Receipt,
} from 'lucide-react';
import { InstallationTemplate, Product, ExtraService } from '../types';
import { dbService } from '../services/db';
import { formatCurrency, safeNumber } from '../utils/formatters';

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
    clienteCI?: string;
    clienteDireccion?: string;
    numeroFactura?: string;
    formaPago?: string;
    items: { productoId: string; cantidad: number }[];
    serviciosExtra?: Omit<ExtraService, 'id'>[];
    descuento?: number;
    observaciones?: string;
  }) => void;
}

interface DraftService {
  key: string;
  nombre: string;
  cantidad: number | '';
  precioVenta: number | '';
  coste: number | '';
}

const createEmptyDraft = (): DraftService => ({
  key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  nombre: '',
  cantidad: 1,
  precioVenta: '',
  coste: '',
});

export const ExecuteInstallationModal: React.FC<ExecuteInstallationModalProps> = ({
  isOpen,
  onClose,
  templates,
  products,
  initialTemplateId,
  onConfirmExecution,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [cliente, setCliente] = useState('');
  const [clienteCI, setClienteCI] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [formaPago, setFormaPago] = useState('USD en efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<{ productoId: string; cantidad: number }[]>([]);
  const [servicios, setServicios] = useState<DraftService[]>([]);
  const [descuento, setDescuento] = useState<number | ''>('');
  const [error, setError] = useState('');

  const motivoTouchedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      motivoTouchedRef.current = false;
      setMotivo('');
      setCliente('');
      setClienteCI('');
      setClienteDireccion('');
      setObservaciones('');
      setNumeroFactura(dbService.getNextInvoiceNumber());
      setFormaPago('USD en efectivo');
      setServicios([]);
      setDescuento('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTemplateId && templates.some((t) => t.id === initialTemplateId)) {
      setSelectedTemplateId(initialTemplateId);
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [initialTemplateId, templates, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    setItems(tpl.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })));
  }, [selectedTemplateId, templates, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (motivoTouchedRef.current) return;

    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (cliente.trim()) {
      setMotivo(`Instalación cliente ${cliente.trim()}`);
    } else if (tpl) {
      setMotivo(`Instalación ${tpl.nombre}`);
    }
  }, [selectedTemplateId, cliente, templates, isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  let costoProductos = 0;
  let ingresoProductos = 0;
  let hasStockShortage = false;

  const enrichedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productoId);
    const subCosto = prod ? item.cantidad * safeNumber(prod.precioCompra) : 0;
    const subIngreso = prod ? item.cantidad * safeNumber(prod.precioVenta) : 0;
    const stockActual = prod ? safeNumber(prod.stockActual) : 0;
    const isSufficient = stockActual >= item.cantidad;

    if (!isSufficient) hasStockShortage = true;

    costoProductos += subCosto;
    ingresoProductos += subIngreso;

    return { ...item, producto: prod, subCosto, subIngreso, stockActual, isSufficient };
  });

  let ingresoServicios = 0;
  let costeServicios = 0;

  const enrichedServicios = servicios.map((s) => {
    const cant = safeNumber(s.cantidad) || 0;
    const pv = safeNumber(s.precioVenta) || 0;
    const c = safeNumber(s.coste) || 0;
    const subtotal = cant * pv;

    ingresoServicios += subtotal;
    costeServicios += cant * c;

    return { ...s, subtotal, cant, pv, c };
  });

  const descuentoAplicado = Math.max(0, safeNumber(descuento) || 0);

  const totalMateriales = ingresoProductos;
  const totalServicios = ingresoServicios;
  const totalBruto = totalMateriales + totalServicios;
  const totalACobrar = Math.max(0, totalBruto - descuentoAplicado);

  const gananciaMateriales = ingresoProductos - costoProductos;
  const gananciaServicios = ingresoServicios - costeServicios;
  const gananciaNetaTotal = gananciaMateriales + gananciaServicios - descuentoAplicado;

  const margenPct = totalBruto > 0 ? Math.round((gananciaNetaTotal / totalBruto) * 100) : 0;

  const handleAddServicio = () => {
    setServicios((prev) => [...prev, createEmptyDraft()]);
  };

  const handleRemoveServicio = (key: string) => {
    setServicios((prev) => prev.filter((s) => s.key !== key));
  };

  const handleUpdateServicio = (
    key: string,
    patch: Partial<Pick<DraftService, 'nombre' | 'cantidad' | 'precioVenta' | 'coste'>>
  ) => {
    setServicios((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

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
      setError('Debes especificar el motivo del movimiento.');
      return;
    }

    const hayProductos = items.some((i) => i.cantidad > 0);
    const hayServicios = servicios.some(
      (s) => s.nombre.trim().length > 0 && safeNumber(s.precioVenta) > 0
    );

    if (!hayProductos && !hayServicios) {
      setError('Debes incluir al menos un producto con cantidad > 0 o un servicio con precio.');
      return;
    }

    for (const s of servicios) {
      const nombreLleno = s.nombre.trim().length > 0;
      const precioVacio = safeNumber(s.precioVenta) <= 0;
      if (nombreLleno && precioVacio) {
        setError(`El servicio "${s.nombre}" no tiene precio de venta. Ponle un precio o bórralo.`);
        return;
      }
    }

    if (hasStockShortage) {
      const ok = confirm(
        'Atención: Uno o más productos superan el stock disponible. ¿Deseas continuar de todos modos?'
      );
      if (!ok) return;
    }

    const serviciosValidos: Omit<ExtraService, 'id'>[] = servicios
      .filter((s) => s.nombre.trim().length > 0)
      .map((s) => ({
        nombre: s.nombre.trim(),
        cantidad: safeNumber(s.cantidad) || 1,
        precioVenta: safeNumber(s.precioVenta) || 0,
        coste: safeNumber(s.coste) || 0,
      }));

    onConfirmExecution({
      plantillaId: currentTemplate?.id,
      plantillaNombre: currentTemplate?.nombre,
      motivo: motivo.trim(),
      cliente: cliente.trim() || undefined,
      clienteCI: clienteCI.trim() || undefined,
      clienteDireccion: clienteDireccion.trim() || undefined,
      numeroFactura: numeroFactura.trim() || undefined,
      formaPago: formaPago.trim() || 'USD en efectivo',
      items: items.filter((i) => i.cantidad > 0),
      serviciosExtra: serviciosValidos.length > 0 ? serviciosValidos : undefined,
      descuento: descuentoAplicado > 0 ? descuentoAplicado : undefined,
      observaciones: observaciones.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
      onClick={(e) => {
        // Cerrar si se pulsa fuera del modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header — fijo arriba */}
        <div className="bg-emerald-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                Registrar Instalación en Cliente
              </h3>
              <p className="text-xs text-emerald-200">
                Descuenta stock, añade servicios y genera la factura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con scroll interno */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Cuerpo scrollable */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Plantilla */}
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

            {/* Motivo + Factura */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo del Movimiento *
                </label>
                <input
                  id="input-installation-motivo"
                  type="text"
                  required
                  value={motivo}
                  onChange={(e) => {
                    motivoTouchedRef.current = true;
                    setMotivo(e.target.value);
                  }}
                  placeholder="Ej: Instalación cliente Pérez"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Nº Factura</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                    Secuencia BD
                  </span>
                </label>
                <input
                  id="input-installation-factura"
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="FAC-00001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold text-emerald-900 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Datos del Cliente (3 campos) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Datos del Cliente (para la factura)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Nombre
                  </label>
                  <input
                    id="input-installation-cliente"
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    CI / NIF
                  </label>
                  <input
                    id="input-installation-cliente-ci"
                    type="text"
                    value={clienteCI}
                    onChange={(e) => setClienteCI(e.target.value)}
                    placeholder="Ej: 87051212345"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Dirección
                  </label>
                  <input
                    id="input-installation-cliente-direccion"
                    type="text"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Ej: Cienfuegos"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Forma de pago + Observaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Forma de Pago
                </label>
                <input
                  id="input-installation-forma-pago"
                  type="text"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  placeholder="USD en efectivo"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observaciones / Notas
                </label>
                <input
                  id="input-installation-observaciones"
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Garantía 2 años"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            {/* Items de la plantilla */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Materiales a descontar del inventario
                </span>
                <span className="text-xs text-slate-500">
                  {enrichedItems.length} productos
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {enrichedItems.map((item, index) => (
                  <div
                    key={item.productoId}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-slate-900 truncate">
                        {item.producto?.nombre || 'Producto desconocido'}
                      </h5>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>
                          Stock: <strong>{item.stockActual}</strong>{' '}
                          {item.producto?.unidadMedida || 'ud'}
                        </span>
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
                          <span className="text-xs text-slate-500">
                            {item.producto?.unidadMedida || 'ud'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                          {formatCurrency(item.subIngreso)}
                        </span>
                      </div>

                      <div className="w-6 text-center">
                        {item.isSufficient ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasStockShortage && (
                <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 border-t border-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Uno o más productos tienen stock insuficiente.</span>
                </div>
              )}
            </div>

            {/* Servicios adicionales */}
            <div className="border border-sky-200 rounded-xl overflow-hidden bg-sky-50/40">
              <div className="bg-sky-100 px-4 py-2.5 flex items-center justify-between border-b border-sky-200">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-sky-700" />
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                    Servicios Adicionales (opcional)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddServicio}
                  className="text-xs px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>

              <div className="p-3 space-y-2">
                {servicios.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3 italic">
                    Sin servicios extra. Añade mano de obra, transporte, etc.
                  </p>
                ) : (
                  <>
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <div className="col-span-4">Nombre</div>
                      <div className="col-span-2 text-center">Cant.</div>
                      <div className="col-span-2 text-right">Precio US$</div>
                      <div className="col-span-2 text-right">Coste US$</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-1 text-center"></div>
                    </div>

                    {enrichedServicios.map((s) => (
                      <div
                        key={s.key}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-sky-200"
                      >
                        <input
                          type="text"
                          value={s.nombre}
                          onChange={(e) =>
                            handleUpdateServicio(s.key, { nombre: e.target.value })
                          }
                          placeholder="Ej: Instalación mecánica"
                          className="col-span-12 sm:col-span-4 px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={s.cantidad}
                          onChange={(e) =>
                            handleUpdateServicio(s.key, {
                              cantidad: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="col-span-4 sm:col-span-2 px-2 py-1 rounded border border-slate-300 text-xs text-center font-bold"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.precioVenta}
                          onChange={(e) =>
                            handleUpdateServicio(s.key, {
                              precioVenta: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="col-span-4 sm:col-span-2 px-2 py-1 rounded border border-slate-300 text-xs text-right"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.coste}
                          onChange={(e) =>
                            handleUpdateServicio(s.key, {
                              coste: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="col-span-3 sm:col-span-2 px-2 py-1 rounded border border-slate-300 text-xs text-right text-amber-700"
                          title="Coste interno: no aparece en factura."
                        />
                        <div className="hidden sm:block sm:col-span-1 text-right text-xs font-mono font-bold text-sky-900">
                          {formatCurrency(s.subtotal)}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveServicio(s.key)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <p className="text-[10px] text-sky-800 italic pt-1">
                      💡 El <strong>coste</strong> es lo que te cuesta a ti el servicio. No
                      aparece en factura; solo para tu margen interno.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Descuento */}
            <div className="flex items-center justify-end gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Descuento (US$):
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={descuento}
                onChange={(e) =>
                  setDescuento(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0.00"
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-right"
              />
            </div>

            {/* Resumen */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Resumen de la Operación
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Materiales ({enrichedItems.length}):</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(totalMateriales)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Servicios ({enrichedServicios.length}):</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(totalServicios)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatCurrency(totalBruto)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span className="font-mono font-semibold">
                    −{formatCurrency(descuentoAplicado)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-emerald-300 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-emerald-950">
                  Total a cobrar:
                </span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {formatCurrency(totalACobrar)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-emerald-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Ganancia interna
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-emerald-800">
                  <span>
                    Mat.: <strong>{formatCurrency(gananciaMateriales)}</strong>
                  </span>
                  <span>
                    Serv.: <strong>{formatCurrency(gananciaServicios)}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {gananciaNetaTotal >= 0 ? '+' : ''}
                    {formatCurrency(gananciaNetaTotal)}
                  </span>
                  <span className="text-xs text-emerald-600 block font-semibold">
                    Margen: {margenPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer — fijo abajo */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
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