import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Product, MovementType } from '../types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
  onConfirmEntry: (params: {
    productoId: string;
    cantidad: number;
    motivo: string;
    precioCompraNuevo?: number;
    proveedor?: string;
    observaciones?: string;
  }) => void;
  onConfirmManualExit?: (params: {
    productoId: string;
    cantidad: number;
    motivo: string;
    cliente?: string;
    observaciones?: string;
  }) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct,
  onConfirmEntry,
  onConfirmManualExit,
}) => {
  const [mode, setMode] = useState<'ENTRADA' | 'SALIDA_MANUAL'>('ENTRADA');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState<number | ''>(10);
  const [motivo, setMotivo] = useState('Recepción de pedido de proveedor');
  const [precioCompra, setPrecioCompra] = useState<number | ''>('');
  const [proveedor, setProveedor] = useState('');
  const [cliente, setCliente] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedProduct) {
      setProductoId(selectedProduct.id);
      setPrecioCompra(selectedProduct.precioCompra);
      setProveedor(selectedProduct.proveedor);
    } else if (products.length > 0 && !productoId) {
      setProductoId(products[0].id);
      setPrecioCompra(products[0].precioCompra);
      setProveedor(products[0].proveedor);
    }
  }, [selectedProduct, products, isOpen]);

  const currentProduct = products.find((p) => p.id === productoId);

  const handleProductChange = (id: string) => {
    setProductoId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setPrecioCompra(prod.precioCompra);
      setProveedor(prod.proveedor);
    }
  };

  const handleModeChange = (newMode: 'ENTRADA' | 'SALIDA_MANUAL') => {
    setMode(newMode);
    if (newMode === 'ENTRADA') {
      setMotivo('Recepción de pedido de proveedor');
    } else {
      setMotivo('Salida manual de material');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!productoId) {
      setError('Selecciona un producto.');
      return;
    }
    const numCant = Number(cantidad);
    if (!cantidad || numCant <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    if (!motivo.trim()) {
      setError('Indica el motivo del movimiento.');
      return;
    }

    if (mode === 'ENTRADA') {
      onConfirmEntry({
        productoId,
        cantidad: numCant,
        motivo: motivo.trim(),
        precioCompraNuevo: precioCompra !== '' ? Number(precioCompra) : undefined,
        proveedor: proveedor.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });
    } else {
      if (currentProduct && numCant > currentProduct.stockActual) {
        if (!confirm(`Atención: La cantidad a retirar (${numCant}) supera el stock actual (${currentProduct.stockActual}). ¿Continuar de todos modos?`)) {
          return;
        }
      }
      if (onConfirmManualExit) {
        onConfirmManualExit({
          productoId,
          cantidad: numCant,
          motivo: motivo.trim(),
          cliente: cliente.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
        });
      }
    }

    onClose();
  };

  const newProjectedStock = currentProduct
    ? mode === 'ENTRADA'
      ? currentProduct.stockActual + (Number(cantidad) || 0)
      : currentProduct.stockActual - (Number(cantidad) || 0)
    : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {mode === 'ENTRADA' ? 'Entrada de Mercancía / Reposición' : 'Salida Manual de Stock'}
              </h3>
              <p className="text-xs text-slate-400">Actualiza las existencias y registra fecha exacta y motivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('ENTRADA')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mode === 'ENTRADA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Entrada de Stock (+)</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('SALIDA_MANUAL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mode === 'SALIDA_MANUAL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Salida Manual (-)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Producto *
            </label>
            <select
              id="select-stock-product"
              value={productoId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (Stock actual: {p.stockActual} {p.unidadMedida || 'ud'})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock vs New Stock Preview */}
          {currentProduct && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Stock Actual:</span>
                <span className="text-sm font-bold text-slate-800">
                  {currentProduct.stockActual} {currentProduct.unidadMedida || 'ud'}
                </span>
                <span className="text-[11px] text-slate-400 block">Mínimo: {currentProduct.stockMinimo}</span>
              </div>
              <div className="text-center font-bold text-slate-400">
                {mode === 'ENTRADA' ? '+' : '-'} {cantidad || 0}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Stock Resultante:</span>
                <span className={`text-base font-extrabold ${newProjectedStock < currentProduct.stockMinimo ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {newProjectedStock} {currentProduct.unidadMedida || 'ud'}
                </span>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cantidad a {mode === 'ENTRADA' ? 'añadir' : 'retirar'} *
              </label>
              <input
                id="input-stock-cantidad"
                type="number"
                min="0.1"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900"
              />
            </div>

            {mode === 'ENTRADA' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Precio de Compra (€/ud)
                </label>
                <input
                  id="input-stock-precio-compra"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioCompra}
                  onChange={(e) => setPrecioCompra(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cliente o Destino
                </label>
                <input
                  id="input-stock-cliente"
                  type="text"
                  placeholder="Ej: Cliente Martínez"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Motivo del Movimiento *
            </label>
            <input
              id="input-stock-motivo"
              type="text"
              required
              placeholder={mode === 'ENTRADA' ? 'Ej: Recepción pedido SolarDistribución SL' : 'Ej: Rotura en transporte / Venta directa'}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observaciones o Albarán
            </label>
            <textarea
              id="textarea-stock-observaciones"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Número de albarán, factura o notas..."
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
              id="btn-confirm-stock-adjustment"
              className={`px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm flex items-center gap-2 transition ${
                mode === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {mode === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
