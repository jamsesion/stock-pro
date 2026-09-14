import React from 'react';
import { 
  AlertTriangle, 
  PackageX, 
  PackagePlus, 
  CheckCircle2, 
  ArrowDownToLine, 
  Building2, 
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface StockAlertsViewProps {
  products: Product[];
  onQuickReplenish: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export const StockAlertsView: React.FC<StockAlertsViewProps> = ({
  products,
  onQuickReplenish,
  onEditProduct,
}) => {
  const alertProducts = products.filter(
    (p) => p.stockActual <= p.stockMinimo
  );

  const outOfStock = alertProducts.filter((p) => p.stockActual <= 0);
  const lowStock = alertProducts.filter((p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo);

  // Calculate estimated investment required to bring all alert products up to their minimum stock
  const estimacionReposicion = alertProducts.reduce((sum, p) => {
    const faltante = Math.max(0, p.stockMinimo - p.stockActual);
    return sum + faltante * p.precioCompra;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Control de Alertas y Stock Mínimo</span>
          </h2>
          <p className="text-xs text-slate-500">
            Productos con existencias iguales o inferiores al umbral mínimo de seguridad configurado
          </p>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          alertProducts.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
        }`}>
          {alertProducts.length} {alertProducts.length === 1 ? 'producto en alerta' : 'productos en alerta'}
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Agotados (Stock 0)</span>
            <PackageX className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 font-mono mt-1">
            {outOfStock.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Paralizan instalaciones si no se reponen</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Bajo Stock Mínimo</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {lowStock.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requieren pedido próximo a proveedor</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Coste para Reponer a Mínimos</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            {formatCurrency(estimacionReposicion)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Inversión necesaria en compras</p>
        </div>
      </div>

      {/* List of Alert Products */}
      {alertProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">¡Todos los productos tienen stock suficiente!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Ningún producto se encuentra por debajo de su umbral mínimo de seguridad en este momento.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {alertProducts.map((product) => {
              const isOut = product.stockActual <= 0;
              const faltante = Math.max(0, product.stockMinimo - product.stockActual);
              const costeReposicion = faltante * product.precioCompra;

              return (
                <div
                  key={product.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isOut ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isOut ? <PackageX className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          isOut ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950 font-bold'
                        }`}>
                          {isOut ? 'Sin existencias' : 'Bajo mínimos'}
                        </span>
                        <span className="text-xs text-slate-400">{product.categoria}</span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-1">
                        {product.nombre}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Proveedor: <strong className="text-slate-700">{product.proveedor}</strong>
                        </span>
                        <span>Precio compra: <strong className="text-slate-700">{formatCurrency(product.precioCompra)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stocks & Quick Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-12 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-500">
                        Stock actual: <span className={`font-mono font-black text-sm ${isOut ? 'text-red-600' : 'text-amber-700'}`}>
                          {product.stockActual}
                        </span> / mín. {product.stockMinimo} {product.unidadMedida || 'ud'}
                      </div>
                      <div className="text-[11px] text-red-600 font-semibold mt-0.5">
                        Faltan: {faltante} {product.unidadMedida || 'ud'} ({formatCurrency(costeReposicion)})
                      </div>
                    </div>

                    <button
                      onClick={() => onQuickReplenish(product)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 whitespace-nowrap"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Reponer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
