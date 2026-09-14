import React from 'react';
import { AlertTriangle, ArrowRight, PackagePlus } from 'lucide-react';
import { Product } from '../types';

interface StockAlertsBannerProps {
  products: Product[];
  onViewAlerts: () => void;
  onQuickReplenish: (product: Product) => void;
}

export const StockAlertsBanner: React.FC<StockAlertsBannerProps> = ({
  products,
  onViewAlerts,
  onQuickReplenish,
}) => {
  const lowStockProducts = products.filter(
    (p) => p.stockActual <= p.stockMinimo
  );

  if (lowStockProducts.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl p-4 shadow-sm my-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <span>Alerta de Stock Mínimo</span>
              <span className="bg-amber-600 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
                {lowStockProducts.length} {lowStockProducts.length === 1 ? 'producto' : 'productos'} bajo mínimos
              </span>
            </h4>
            <div className="text-xs text-amber-900 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Productos críticos:</span>
              {lowStockProducts.slice(0, 3).map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 font-medium bg-amber-200/70 px-2 py-0.5 rounded text-amber-950">
                  {p.nombre}: <strong>{p.stockActual}</strong> / min {p.stockMinimo} {p.unidadMedida || 'ud'}
                </span>
              ))}
              {lowStockProducts.length > 3 && (
                <span className="text-amber-800 italic">
                  +{lowStockProducts.length - 3} más
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lowStockProducts[0] && (
            <button
              onClick={() => onQuickReplenish(lowStockProducts[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Reponer {lowStockProducts[0].nombre.slice(0, 15)}...
            </button>
          )}
          <button
            onClick={onViewAlerts}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-300 transition"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
