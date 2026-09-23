import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Layers, Calculator, AlertTriangle } from 'lucide-react';
import { InstallationTemplate, Product, TemplateItem } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    template: Omit<InstallationTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => void;
  initialTemplate?: InstallationTemplate | null;
  products: Product[];
  allTemplates?: InstallationTemplate[];
}

const safeNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTemplate,
  products,
  allTemplates = [],
}) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Autoconsumo Fotovoltaico');
  const [tiempoEstimadoHoras, setTiempoEstimadoHoras] = useState<number | ''>('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<number | ''>(1);
  const [error, setError] = useState('');

  // Reset limpio al abrir
  useEffect(() => {
    if (!isOpen) return;

    if (initialTemplate) {
      setNombre(initialTemplate.nombre);
      setDescripcion(initialTemplate.descripcion || '');
      setCategoria(initialTemplate.categoria || 'Autoconsumo Fotovoltaico');
      setTiempoEstimadoHoras(initialTemplate.tiempoEstimadoHoras || '');
      setItems(initialTemplate.items ? [...initialTemplate.items] : []);
    } else {
      setNombre('');
      setDescripcion('');
      setCategoria('Autoconsumo Fotovoltaico');
      setTiempoEstimadoHoras('');
      setItems([]);
    }
    setError('');
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setSelectedQuantity(1);
    }
  }, [initialTemplate, isOpen, products]);

  if (!isOpen) return null;

  let costoMateriales = 0;
  let valorVentaEstimado = 0;

  items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productoId);
    if (prod) {
      costoMateriales += safeNumber(item.cantidad) * safeNumber(prod.precioCompra);
      valorVentaEstimado += safeNumber(item.cantidad) * safeNumber(prod.precioVenta);
    }
  });

  const gananciaEstimada = valorVentaEstimado - costoMateriales;

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const qty = Number(selectedQuantity);
    if (!selectedQuantity || qty <= 0) {
      setError('La cantidad a consumir debe ser mayor a 0.');
      return;
    }

    const existingIndex = items.findIndex((i) => i.productoId === selectedProductId);
    if (existingIndex !== -1) {
      const updated = [...items];
      updated[existingIndex].cantidad += qty;
      setItems(updated);
    } else {
      setItems([...items, { productoId: selectedProductId, cantidad: qty }]);
    }

    setSelectedQuantity(1);
    setError('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...items];
    updated[index].cantidad = newQty;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }
    if (items.length === 0) {
      setError('Debes añadir al menos un producto a la plantilla.');
      return;
    }

    // Anti-duplicados
    const nombreNorm = nombre.trim().toLowerCase();
    const duplicada = allTemplates.find(
      (t) => t.nombre.trim().toLowerCase() === nombreNorm && t.id !== initialTemplate?.id
    );
    if (duplicada) {
      setError(`Ya existe una plantilla con ese nombre ("${duplicada.nombre}").`);
      return;
    }

    onSave({
      id: initialTemplate ? initialTemplate.id : undefined,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      tiempoEstimadoHoras: tiempoEstimadoHoras !== '' ? Number(tiempoEstimadoHoras) : undefined,
      items,
    });

    onClose();
  };

  const currentlySelectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {initialTemplate ? 'Editar Plantilla de Instalación' : 'Nueva Plantilla de Instalación'}
              </h3>
              <p className="text-xs text-slate-400">
                Define los materiales y cantidades consumidas por este tipo de instalación
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre de la Plantilla *
              </label>
              <input
                id="input-template-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Instalación inversor 10kW"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoría
              </label>
              <input
                id="input-template-categoria"
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: Autoconsumo Fotovoltaico, Baterías..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descripción del Kit / Trabajo
              </label>
              <input
                id="input-template-descripcion"
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Kit completo con inversor, 20 paneles solares y 50m cableado."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tiempo Estimado (horas)
              </label>
              <input
                id="input-template-tiempo"
                type="number"
                min="0.5"
                step="0.5"
                value={tiempoEstimadoHoras}
                onChange={(e) =>
                  setTiempoEstimadoHoras(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Ej: 16"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
              <span>Productos y Materiales Consumidos</span>
              <span className="text-slate-500 lowercase font-normal">
                (ej: Inversor 10kW → 1 ud, Panel solar → 20 ud, Cable → 50 metros)
              </span>
            </h4>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-2 mb-4">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Seleccionar Producto del Catálogo
                </label>
                <select
                  id="select-template-product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.categoria}) — Stock: {p.stockActual} {p.unidadMedida || 'ud'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-36">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cantidad ({currentlySelectedProduct?.unidadMedida || 'ud'})
                </label>
                <input
                  id="input-template-item-qty"
                  type="number"
                  min="0.1"
                  step="any"
                  value={selectedQuantity}
                  onChange={(e) =>
                    setSelectedQuantity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-bold"
                />
              </div>

              <button
                type="button"
                id="btn-add-item-to-template"
                onClick={handleAddItem}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Añadir</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  No hay productos en esta plantilla todavía
                </p>
                <p className="text-xs text-slate-400">
                  Selecciona productos arriba y pulsa &quot;Añadir&quot;
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3">Cantidad</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3 text-right">Subtotal Compra</th>
                      <th className="py-2.5 px-3 text-right">Subtotal Venta</th>
                      <th className="py-2.5 px-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                      const prod = products.find((p) => p.id === item.productoId);
                      const cant = safeNumber(item.cantidad);
                      const subCompra = prod ? cant * safeNumber(prod.precioCompra) : 0;
                      const subVenta = prod ? cant * safeNumber(prod.precioVenta) : 0;
                      const hasEnoughStock = prod ? prod.stockActual >= cant : false;

                      return (
                        <tr key={item.productoId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            <div>{prod?.nombre || 'Producto desconocido'}</div>
                            <div className="text-[11px] text-slate-400">{prod?.categoria}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateItemQty(index, Number(e.target.value))}
                                className="w-16 px-2 py-1 rounded border border-slate-300 text-xs font-bold text-center"
                              />
                              <span className="text-xs text-slate-500">
                                {prod?.unidadMedida || 'ud'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                hasEnoughStock
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {prod ? `${prod.stockActual} ${prod.unidadMedida || 'ud'}` : '0'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono text-xs">
                            {formatCurrency(subCompra)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold font-mono text-xs">
                            {formatCurrency(subVenta)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-950 font-bold uppercase tracking-wider">
              <Calculator className="w-5 h-5 text-amber-600" />
              <span>Balance de Materiales por Instalación</span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-xs text-slate-500 block">Coste Materiales:</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(costoMateriales)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">PVP Materiales:</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(valorVentaEstimado)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Ganancia Proyectada:</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatCurrency(gananciaEstimada)}
                </span>
              </div>
            </div>
          </div>

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
              id="btn-save-template"
              className="px-5 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {initialTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};