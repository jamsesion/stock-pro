import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  ArrowDownToLine, 
  FileSpreadsheet, 
  Package, 
  CheckCircle2,
  Calendar,
  Building2,
  X
} from 'lucide-react';
import { Product } from '../types';
import { calculateProfit, formatCurrency, formatDate } from '../utils/formatters';

interface ProductsViewProps {
  products: Product[];
  categories: string[];
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickReplenish: (product: Product) => void;
  initialFilterLowStock?: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickReplenish,
  initialFilterLowStock = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(initialFilterLowStock);
  const [sortBy, setSortBy] = useState<'nombre' | 'stock' | 'ganancia' | 'fecha'>('nombre');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.proveedor.toLowerCase().includes(search.toLowerCase()) ||
          p.categoria.toLowerCase().includes(search.toLowerCase()) ||
          (p.ubicacion && p.ubicacion.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory = selectedCategory === 'ALL' || p.categoria === selectedCategory;

        const matchesLowStock = !onlyLowStock || p.stockActual <= p.stockMinimo;

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        if (sortBy === 'stock') {
          return a.stockActual - b.stockActual;
        }
        if (sortBy === 'ganancia') {
          const profitA = (a.precioVenta || 0) - (a.precioCompra || 0);
          const profitB = (b.precioVenta || 0) - (b.precioCompra || 0);
          return profitB - profitA;
        }
        if (sortBy === 'fecha') {
          return new Date(b.fechaEntrada || 0).getTime() - new Date(a.fechaEntrada || 0).getTime();
        }
        return a.nombre.localeCompare(b.nombre);
      });
  }, [products, search, selectedCategory, onlyLowStock, sortBy]);

  const exportCSV = () => {
    const headers = [
      'ID',
      'Nombre',
      'Categoria',
      'Stock Actual',
      'Stock Minimo',
      'Unidad',
      'Precio Compra',
      'Precio Venta',
      'Ganancia Unitaria',
      'Margen %',
      'Proveedor',
      'Fecha Entrada',
      'Ubicacion'
    ];

    const rows = filteredProducts.map((p) => {
      const { ganancia, margenPorcentaje } = calculateProfit(p.precioVenta, p.precioCompra);
      return [
        p.id,
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.categoria}"`,
        p.stockActual,
        p.stockMinimo,
        p.unidadMedida || 'ud',
        p.precioCompra,
        p.precioVenta,
        ganancia,
        margenPorcentaje,
        `"${p.proveedor.replace(/"/g, '""')}"`,
        p.fechaEntrada,
        `"${p.ubicacion || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_productos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lowStockTotal = products.filter((p) => p.stockActual <= p.stockMinimo).length;

  return (
    <div className="space-y-4">
      {/* Top action & search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-products"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, proveedor, categoría..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <select
            id="select-sort-products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="nombre">Ordenar: Nombre</option>
            <option value="stock">Ordenar: Menor Stock</option>
            <option value="ganancia">Ordenar: Mayor Ganancia</option>
            <option value="fecha">Ordenar: Fecha Entrada</option>
          </select>

          {/* Low stock toggle */}
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              onlyLowStock
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Bajo mínimos ({lowStockTotal})</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            title="Exportar catálogo a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </button>

          {/* New product button */}
          <button
            id="btn-add-product"
            onClick={onNewProduct}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No se encontraron productos</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Prueba cambiando los filtros de búsqueda o registra un nuevo producto en la base de datos.
            </p>
            <button
              onClick={onNewProduct}
              className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs hover:bg-amber-600 transition"
            >
              <Plus className="w-4 h-4" />
              Crear Producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Producto y Categoría</th>
                  <th className="py-3 px-3">Stock Actual / Mínimo</th>
                  <th className="py-3 px-3 text-right">Precio Compra</th>
                  <th className="py-3 px-3 text-right">Precio Venta</th>
                  <th className="py-3 px-3 text-right">Ganancia Unitaria</th>
                  <th className="py-3 px-3">Proveedor</th>
                  <th className="py-3 px-3">Fecha Entrada</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => {
                  const { ganancia, margenPorcentaje } = calculateProfit(
                    product.precioVenta,
                    product.precioCompra
                  );
                  const isLowStock = product.stockActual <= product.stockMinimo;
                  const isOut = product.stockActual <= 0;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50 transition ${
                        isLowStock ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Nombre y Categoría */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {product.nombre}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                            {product.categoria}
                          </span>
                          {product.ubicacion && (
                            <span className="text-[11px] text-slate-400">
                              📍 {product.ubicacion}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Actual / Mínimo */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm px-2.5 py-0.5 rounded-lg font-mono ${
                              isOut
                                ? 'bg-red-600 text-white'
                                : isLowStock
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {product.stockActual} {product.unidadMedida || 'ud'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>Mín: {product.stockMinimo}</span>
                          {isLowStock && (
                            <span className="text-red-600 font-bold flex items-center gap-0.5 text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              ¡Reponer!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Precio de Compra */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(product.precioCompra)}
                      </td>

                      {/* Precio de Venta */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(product.precioVenta)}
                      </td>

                      {/* Ganancia calculada automáticamente */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-mono font-black ${ganancia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatCurrency(ganancia)}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          Margen: {margenPorcentaje}%
                        </span>
                      </td>

                      {/* Proveedor */}
                      <td className="py-3 px-3 text-slate-700">
                        <div className="flex items-center gap-1 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={product.proveedor}>
                            {product.proveedor}
                          </span>
                        </div>
                      </td>

                      {/* Fecha de entrada */}
                      <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(product.fechaEntrada)}</span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onQuickReplenish(product)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Entrada rápida de stock"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(product)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Editar producto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-product-${product.id}`}
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-app Product Deletion Modal (compatible with sandboxed iframe) */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Eliminar Producto</h3>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700">
                ¿Estás seguro de que deseas eliminar permanentemente este producto del catálogo?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-sm font-bold text-slate-900">{productToDelete.nombre}</p>
                <p className="text-xs text-slate-500">Categoría: {productToDelete.categoria || 'Sin categoría'}</p>
                <p className="text-xs text-slate-500">
                  Stock actual: <strong className="text-slate-900">{productToDelete.stockActual} {productToDelete.unidadMedida || 'ud'}</strong>
                </p>
                <p className="text-xs text-slate-500">Proveedor: {productToDelete.proveedor}</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-product"
                  onClick={() => {
                    onDeleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Producto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
