import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Wrench,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { InstallationTemplate, Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TemplatesViewProps {
  templates: InstallationTemplate[];
  products: Product[];
  onCreateTemplate: () => void;
  onEditTemplate: (template: InstallationTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onExecuteTemplate: (template: InstallationTemplate) => void;
}

// Helper a prueba de datos corruptos: convierte cualquier valor a número seguro.
// Evita que aparezca "NaN" si en el .json hay strings, nulls o undefined.
const safeNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  products,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onExecuteTemplate,
}) => {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [templateToDelete, setTemplateToDelete] = useState<InstallationTemplate | null>(null);

  const categories = Array.from(
    new Set(templates.map((t) => t.categoria || 'Autoconsumo Fotovoltaico'))
  );

  const filteredTemplates = templates.filter((t) => {
    if (filterCategory === 'ALL') return true;
    return (t.categoria || 'Autoconsumo Fotovoltaico') === filterCategory;
  });

  // PVP total de una plantilla, calculado con protección contra datos corruptos
  const computeTemplatePVP = (template: InstallationTemplate): number => {
    if (!template?.items?.length) return 0;
    return template.items.reduce((sum, item) => {
      const p = products.find((pr) => pr.id === item.productoId);
      if (!p) return sum;
      const precio = safeNumber(p.precioVenta);
      const cant = safeNumber(item.cantidad);
      return sum + precio * cant;
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Top action & filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>Plantillas de Instalación Editables</span>
          </h2>
          <p className="text-xs text-slate-500">
            Define kits de materiales (inversores, paneles, cables) para descontar en 1 clic
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            id="btn-create-template"
            onClick={onCreateTemplate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Plantilla</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700">No hay plantillas de instalación</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crea tu primera plantilla configurable (ejemplo: &quot;Instalación inversor 10kW&quot;
            con inversores, paneles y cable).
          </p>
          <button
            onClick={onCreateTemplate}
            className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs hover:bg-amber-600 transition"
          >
            <Plus className="w-4 h-4" />
            Crear Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            let costoMateriales = 0;
            let valorVenta = 0;
            let maxInstallationsPossible = Infinity;
            let missingStockCount = 0;

            const componentsDetail = template.items.map((item) => {
              const product = products.find((p) => p.id === item.productoId);
              const stock = product ? safeNumber(product.stockActual) : 0;
              const precioCompra = product ? safeNumber(product.precioCompra) : 0;
              const precioVenta = product ? safeNumber(product.precioVenta) : 0;
              const cantidad = safeNumber(item.cantidad);

              const subCosto = cantidad * precioCompra;
              const subVenta = cantidad * precioVenta;

              costoMateriales += subCosto;
              valorVenta += subVenta;

              if (cantidad > 0) {
                const possible = Math.floor(stock / cantidad);
                if (possible < maxInstallationsPossible) maxInstallationsPossible = possible;
                if (stock < cantidad) missingStockCount++;
              }

              return {
                ...item,
                cantidad,
                product,
                stock,
                subCosto,
                subVenta,
                hasEnough: stock >= cantidad,
              };
            });

            if (maxInstallationsPossible === Infinity) maxInstallationsPossible = 0;
            const gananciaEstimada = valorVenta - costoMateriales;

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        {template.categoria || 'Autoconsumo'}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                        {template.nombre}
                      </h3>
                      {template.descripcion && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {template.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditTemplate(template)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="Editar plantilla"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(template)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    {template.tiempoEstimadoHoras && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {template.tiempoEstimadoHoras}h montaje
                      </span>
                    )}

                    {missingStockCount === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stock para {maxInstallationsPossible}{' '}
                        {maxInstallationsPossible === 1 ? 'instalación' : 'instalaciones'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Falta stock en {missingStockCount}{' '}
                        {missingStockCount === 1 ? 'material' : 'materiales'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Consumed List */}
                <div className="p-4 bg-slate-50/50 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                    <span>Productos consumidos ({componentsDetail.length})</span>
                    <span className="text-[11px] text-slate-400 font-normal">Unidades por kit</span>
                  </div>

                  <ul className="space-y-1.5 text-xs">
                    {componentsDetail.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.hasEnough ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-semibold text-slate-800 truncate">
                            {item.product?.nombre || 'Producto desconocido'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {item.cantidad} {item.product?.unidadMedida || 'ud'}
                          </span>
                          <span className="text-[11px] text-slate-400">(Stock: {item.stock})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Financial Summary & Action */}
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs w-full sm:w-auto justify-between sm:justify-start">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Coste Materiales:</span>
                      <span className="font-semibold text-slate-700 font-mono">
                        {formatCurrency(costoMateriales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">PVP Instalación:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatCurrency(valorVenta)}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-emerald-700 block text-[11px] font-bold">
                        Ganancia Neta:
                      </span>
                      <span className="font-black text-emerald-700 font-mono text-sm">
                        +{formatCurrency(gananciaEstimada)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onExecuteTemplate(template)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Ejecutar Instalación</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app Template Deletion Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Eliminar Plantilla</h3>
              </div>
              <button
                onClick={() => setTemplateToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700">
                ¿Estás seguro de que deseas eliminar esta plantilla de instalación?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-sm font-bold text-slate-900">{templateToDelete.nombre}</p>
                <p className="text-xs text-slate-500">
                  Categoría: {templateToDelete.categoria || 'Autoconsumo'}
                </p>
                <p className="text-xs text-slate-500">
                  {templateToDelete.items.length} productos configurados en el kit
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  PVP: {formatCurrency(computeTemplatePVP(templateToDelete))}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTemplateToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-template"
                  onClick={() => {
                    onDeleteTemplate(templateToDelete.id);
                    setTemplateToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Plantilla</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};