import React, { useState, useEffect } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { Product, UnitOfMeasure } from '../types';
import { calculateProfit, formatCurrency, getTodayDateString } from '../utils/formatters';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  initialProduct?: Product | null;
  categories: string[];
  allProducts?: Product[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct,
  categories,
  allProducts = [],
}) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [stockActual, setStockActual] = useState<number | ''>(0);
  const [stockMinimo, setStockMinimo] = useState<number | ''>(0);
  const [precioCompra, setPrecioCompra] = useState<number | ''>(0);
  const [precioVenta, setPrecioVenta] = useState<number | ''>(0);
  const [proveedor, setProveedor] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState(getTodayDateString());
  const [unidadMedida, setUnidadMedida] = useState<UnitOfMeasure | string>('ud');
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset limpio al abrir o cambiar de producto
  useEffect(() => {
    if (!isOpen) return;

    if (initialProduct) {
      setNombre(initialProduct.nombre);
      setCategoria(initialProduct.categoria);
      setStockActual(initialProduct.stockActual);
      setStockMinimo(initialProduct.stockMinimo);
      setPrecioCompra(initialProduct.precioCompra);
      setPrecioVenta(initialProduct.precioVenta);
      setProveedor(initialProduct.proveedor);
      setFechaEntrada(initialProduct.fechaEntrada || getTodayDateString());
      setUnidadMedida(initialProduct.unidadMedida || 'ud');
      setUbicacion(initialProduct.ubicacion || '');
      setNotas(initialProduct.notas || '');
    } else {
      setNombre('');
      setCategoria('');
      setStockActual(0);
      setStockMinimo(1);
      setPrecioCompra(0);
      setPrecioVenta(0);
      setProveedor('');
      setFechaEntrada(getTodayDateString());
      setUnidadMedida('ud');
      setUbicacion('');
      setNotas('');
    }
    setErrors({});
  }, [initialProduct, isOpen]);

  if (!isOpen) return null;

  const numVenta = typeof precioVenta === 'number' ? precioVenta : 0;
  const numCompra = typeof precioCompra === 'number' ? precioCompra : 0;
  const { ganancia, margenPorcentaje } = calculateProfit(numVenta, numCompra);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = 'El nombre del producto es obligatorio.';
    if (!proveedor.trim()) newErrors.proveedor = 'El proveedor es obligatorio.';
    if (stockActual === '' || Number(stockActual) < 0) newErrors.stockActual = 'El stock debe ser ≥ 0.';
    if (stockMinimo === '' || Number(stockMinimo) < 0) newErrors.stockMinimo = 'El stock mínimo debe ser ≥ 0.';
    if (precioCompra === '' || Number(precioCompra) < 0) newErrors.precioCompra = 'Precio no válido.';
    if (precioVenta === '' || Number(precioVenta) < 0) newErrors.precioVenta = 'Precio no válido.';
    if (!fechaEntrada) newErrors.fechaEntrada = 'Requerido.';

    // Anti-duplicados: comprobar que no exista otro producto con el mismo nombre
    // (excepto el propio producto si estamos editando)
    const nombreNormalizado = nombre.trim().toLowerCase();
    const duplicado = allProducts.find(
      (p) =>
        p.nombre.trim().toLowerCase() === nombreNormalizado &&
        p.id !== initialProduct?.id
    );
    if (duplicado) {
      newErrors.nombre = `Ya existe un producto con ese nombre ("${duplicado.nombre}").`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      id: initialProduct ? initialProduct.id : undefined,
      nombre: nombre.trim(),
      categoria: categoria.trim() || 'General',
      stockActual: Number(stockActual),
      stockMinimo: Number(stockMinimo),
      precioCompra: Number(precioCompra),
      precioVenta: Number(precioVenta),
      proveedor: proveedor.trim(),
      fechaEntrada,
      unidadMedida,
      ubicacion: ubicacion.trim() || undefined,
      notas: notas.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold leading-tight">
              {initialProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Datos de catálogo, cálculo automático de ganancia y umbrales de stock
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 text-xs">
            {/* Row 1: Nombre & Categoría */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Producto *
                </label>
                <input
                  id="input-product-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Inversor 10kW Híbrido Deye / Panel 450W"
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                    errors.nombre ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.nombre && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.nombre}</p>
                )}
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Categoría <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  {categoria && (
                    <button
                      type="button"
                      onClick={() => setCategoria('')}
                      className="text-[10px] text-slate-400 hover:text-red-500 transition"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <input
                  id="input-product-categoria"
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej: Inversores, Baterías o dejar vacío"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                />
                {categories.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400">Sugerencias:</span>
                    {categories.slice(0, 3).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoria(cat)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                          categoria === cat
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Proveedor, Fecha, Ubicación */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Proveedor *
                </label>
                <input
                  id="input-product-proveedor"
                  type="text"
                  required
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej: SolarDistribución SL"
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                    errors.proveedor ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.proveedor && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.proveedor}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha de Entrada *
                </label>
                <input
                  id="input-product-fecha-entrada"
                  type="date"
                  required
                  value={fechaEntrada}
                  onChange={(e) => setFechaEntrada(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ubicación almacén
                </label>
                <input
                  id="input-product-ubicacion"
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: Pasillo 2 / Estante B"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Row 3: Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Stock Actual *
                </label>
                <input
                  id="input-product-stock-actual"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={stockActual}
                  onChange={(e) => setStockActual(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Stock Mínimo (Alerta) *
                </label>
                <input
                  id="input-product-stock-minimo"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unidad de Medida
                </label>
                <select
                  id="select-product-unidad"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="ud">Unidades (ud)</option>
                  <option value="metros">Metros (m)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="cajas">Cajas</option>
                  <option value="paquetes">Paquetes</option>
                  <option value="rollos">Rollos</option>
                </select>
              </div>
            </div>

            {/* Row 4: Precios */}
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  Precios y Ganancia (Venta - Compra)
                </span>
                <span className="text-[10px] text-amber-700 font-medium">Cálculo automático</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                    Precio Compra (€) *
                  </label>
                  <input
                    id="input-product-precio-compra"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                    Precio Venta (€) *
                  </label>
                  <input
                    id="input-product-precio-venta"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  />
                </div>

                <div className="bg-white p-2 rounded-lg border border-amber-200/90 text-center">
                  <span className="text-[10px] text-slate-500 block">Ganancia / ud:</span>
                  <span
                    className={`text-xs sm:text-sm font-extrabold font-mono ${
                      ganancia >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(ganancia)}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-amber-200/90 text-center">
                  <span className="text-[10px] text-slate-500 block">Margen:</span>
                  <span
                    className={`inline-block text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      margenPorcentaje >= 25
                        ? 'bg-emerald-100 text-emerald-800'
                        : margenPorcentaje > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {margenPorcentaje}%
                  </span>
                </div>
              </div>
            </div>

            {/* Row 5: Notas */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notas u Observaciones <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                id="input-product-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Garantía, especificaciones técnicas, compatibilidad..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-product"
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{initialProduct ? 'Guardar Cambios' : 'Registrar Producto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};