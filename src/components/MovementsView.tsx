import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wrench,
  Search,
  Clock,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Trash2,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  History,
} from 'lucide-react';
import { StockMovement } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportToCsv } from '../utils/csv';
import { dbService } from '../services/db';
import { generateInvoicePDF } from '../utils/pdf';

interface MovementsViewProps {
  movements: StockMovement[];
  onNewStockEntry: () => void;
  onExecuteInstallation: () => void;
  onDeleteMovement: (movementId: string, revertStock: boolean) => void;
  onDeleteMultipleMovements: (movementIds: string[], revertStock: boolean) => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  onNewStockEntry,
  onExecuteInstallation,
  onDeleteMovement,
  onDeleteMultipleMovements,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkRevertStock, setBulkRevertStock] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<StockMovement | null>(null);
  const [revertStock, setRevertStock] = useState(false);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        m.motivo.toLowerCase().includes(q) ||
        (m.cliente && m.cliente.toLowerCase().includes(q)) ||
        (m.numeroFactura && m.numeroFactura.toLowerCase().includes(q)) ||
        (m.plantillaNombre && m.plantillaNombre.toLowerCase().includes(q)) ||
        (m.fechaHora && m.fechaHora.includes(search)) ||
        m.items.some((i) => i.productoNombre.toLowerCase().includes(q));

      const matchesType = filterType === 'ALL' || m.tipo === filterType;
      return matchesSearch && matchesType;
    });
  }, [movements, search, filterType]);

  const toggleExpand = (id: string) => {
    setExpandedMovementId(expandedMovementId === id ? null : id);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredMovements.map((m) => m.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const openDeleteSingle = (movement: StockMovement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMovementToDelete(movement);
    setRevertStock(false);
  };

  const confirmDeleteSingle = () => {
    if (!movementToDelete) return;
    onDeleteMovement(movementToDelete.id, revertStock);
    setSelectedIds((prev) => prev.filter((id) => id !== movementToDelete.id));
    setMovementToDelete(null);
  };

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteMultipleMovements(selectedIds, bulkRevertStock);
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const exportCSV = () => {
    const headers = [
      'ID',
      'Nº Factura',
      'Fecha y Hora',
      'Tipo',
      'Motivo',
      'Cliente',
      'Plantilla',
      'Productos',
      'Coste Total',
      'Ingreso Total',
      'Ganancia Total',
    ];

    const rows = filteredMovements.map((m) => {
      const itemsSummary = m.items
        .map((i) => `${i.productoNombre}: ${i.cantidad} ${i.unidadMedida}`)
        .join(' | ');
      return [
        m.id,
        m.numeroFactura || '',
        formatDateTime(m.fechaHora),
        m.tipo,
        m.motivo,
        m.cliente || '',
        m.plantillaNombre || '',
        itemsSummary,
        m.costoTotal,
        m.ingresoTotal,
        m.gananciaTotal,
      ];
    });

    exportToCsv(
      `registro_movimientos_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  // ---- NUEVO: Exportar factura PDF ----
  const handleExportInvoicePDF = (movement: StockMovement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (movement.tipo !== 'SALIDA_INSTALACION') {
        onShowToast?.('Solo se pueden exportar facturas de instalaciones.', 'warning');
        return;
      }
      const empresa = dbService.getEmpresa();
      generateInvoicePDF(movement, empresa);
      onShowToast?.('Factura PDF generada correctamente.', 'success');
    } catch (err) {
      console.error('Error generando PDF:', err);
      onShowToast?.('Error al generar el PDF de la factura.', 'warning');
    }
  };

  const totalInstallations = movements.filter((m) => m.tipo === 'SALIDA_INSTALACION').length;
  const totalEntries = movements.filter((m) => m.tipo === 'ENTRADA_STOCK').length;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-movements"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por motivo, cliente, factura, producto..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="select-filter-movement-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Todos ({movements.length})</option>
            <option value="SALIDA_INSTALACION">Instalaciones ({totalInstallations})</option>
            <option value="ENTRADA_STOCK">Entradas Proveedor ({totalEntries})</option>
            <option value="SALIDA_MANUAL">Salidas Manuales</option>
            <option value="AJUSTE_INVENTARIO">Ajustes</option>
          </select>

          <button
            onClick={exportCSV}
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            title="Exportar movimientos a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            onClick={onNewStockEntry}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            <span>Entrada Mercancía</span>
          </button>

          <button
            onClick={onExecuteInstallation}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Wrench className="w-4 h-4" />
            <span>Nueva Instalación</span>
          </button>
        </div>
      </div>

      {/* Multi-selection bar */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <CheckSquare className="w-4 h-4 text-amber-600" />
            <span>
              {selectedIds.length} {selectedIds.length === 1 ? 'registro' : 'registros'}{' '}
              seleccionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-amber-100/60 transition"
            >
              Deseleccionar
            </button>
            <button
              id="btn-bulk-delete-movements"
              onClick={() => {
                setBulkRevertStock(false);
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar {selectedIds.length}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredMovements.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 hover:text-slate-800 transition font-medium"
            >
              {filteredMovements.every((m) => selectedIds.includes(m.id)) ? (
                <CheckSquare className="w-4 h-4 text-amber-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Seleccionar visibles ({filteredMovements.length})</span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <History className="w-3.5 h-3.5" />
              <span>Historial cronológico</span>
            </div>
          </div>
        )}

        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No hay movimientos</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Cada instalación o entrada de mercancía se registra aquí con fecha y hora exacta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredMovements.map((movement) => {
              const isExpanded = expandedMovementId === movement.id;
              const isSelected = selectedIds.includes(movement.id);
              const isInstallation = movement.tipo === 'SALIDA_INSTALACION';
              const isEntry = movement.tipo === 'ENTRADA_STOCK';

              return (
                <div
                  key={movement.id}
                  className={`hover:bg-slate-50/80 transition ${
                    isSelected ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(movement.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(movement.id, e)}
                        className="mt-1 text-slate-400 hover:text-amber-600 p-0.5 rounded transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>

                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isInstallation
                            ? 'bg-emerald-100 text-emerald-800'
                            : isEntry
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isInstallation ? (
                          <Wrench className="w-5 h-5" />
                        ) : isEntry ? (
                          <ArrowDownToLine className="w-5 h-5" />
                        ) : (
                          <ArrowUpFromLine className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isInstallation
                                ? 'bg-emerald-600 text-white'
                                : isEntry
                                ? 'bg-sky-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {isInstallation ? 'Instalación' : isEntry ? 'Entrada Stock' : 'Salida'}
                          </span>

                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTime(movement.fechaHora)}
                          </span>

                          {movement.numeroFactura && (
                            <span className="text-[11px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {movement.numeroFactura}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                          <span>{movement.motivo}</span>
                          {movement.plantillaNombre && (
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {movement.plantillaNombre}
                            </span>
                          )}
                        </h4>

                        {movement.cliente && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            Cliente: <strong className="text-slate-800">{movement.cliente}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {movement.items.length}{' '}
                          {movement.items.length === 1 ? 'producto' : 'productos'}
                          {movement.serviciosExtra && movement.serviciosExtra.length > 0 && (
                            <> + {movement.serviciosExtra.length} serv.</>
                          )}
                        </span>
                        {isInstallation && movement.gananciaTotal > 0 ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-extrabold text-sm font-mono">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{formatCurrency(movement.gananciaTotal)}</span>
                          </div>
                        ) : isEntry ? (
                          <span className="text-xs font-semibold text-slate-600 font-mono">
                            Coste: {formatCurrency(movement.costoTotal)}
                          </span>
                        ) : null}
                      </div>

                      {/* Botón PDF — solo en instalaciones */}
                      {isInstallation && (
                        <button
                          type="button"
                          onClick={(e) => handleExportInvoicePDF(movement, e)}
                          title="Exportar factura PDF"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => openDeleteSingle(movement, e)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Desglose:
                        </div>
                        <button
                          type="button"
                          onClick={() => openDeleteSingle(movement)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      {/* Tabla de productos */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Producto</th>
                              <th className="py-2 px-3 text-center">Cantidad</th>
                              <th className="py-2 px-3 text-center">Stock Antes → Después</th>
                              <th className="py-2 px-3 text-right">Precio</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {movement.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-slate-900">
                                  {item.productoNombre}
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-slate-800">
                                  {isEntry ? '+' : '-'}
                                  {item.cantidad} {item.unidadMedida}
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-slate-500">
                                  {item.stockAnterior} →{' '}
                                  <strong className="text-slate-900">{item.stockPosterior}</strong>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">
                                  {formatCurrency(
                                    isEntry
                                      ? item.precioCompraUnitario
                                      : item.precioVentaUnitario
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(
                                    item.cantidad *
                                      (isEntry
                                        ? item.precioCompraUnitario
                                        : item.precioVentaUnitario)
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Servicios extra */}
                      {movement.serviciosExtra && movement.serviciosExtra.length > 0 && (
                        <div className="mt-3 bg-sky-50 rounded-xl border border-sky-200 overflow-hidden">
                          <div className="px-3 py-1.5 bg-sky-100 border-b border-sky-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900">
                              Servicios adicionales
                            </span>
                          </div>
                          <table className="w-full text-left text-xs">
                            <tbody className="divide-y divide-sky-100">
                              {movement.serviciosExtra.map((s, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-medium text-slate-900">
                                    {s.nombre}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-800">
                                    {s.cantidad}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                                    {formatCurrency(s.precioVenta)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatCurrency(s.cantidad * s.precioVenta)}
                                  </td>
                                  {s.coste > 0 && (
                                    <td className="py-2 px-3 text-right text-[10px] text-amber-700 italic">
                                      coste: {formatCurrency(s.coste)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {movement.descuento && movement.descuento > 0 && (
                        <p className="text-xs text-red-700 mt-2 bg-red-50 p-2.5 rounded-lg border border-red-200">
                          <strong>Descuento aplicado:</strong>{' '}
                          {formatCurrency(movement.descuento)}
                        </p>
                      )}

                      {movement.observaciones && (
                        <p className="text-xs text-slate-500 mt-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          <strong>Observaciones:</strong> {movement.observaciones}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete single */}
      {movementToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Eliminar Registro</h3>
              </div>
              <button
                onClick={() => setMovementToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700">¿Eliminar este registro del historial?</p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {movementToDelete.motivo}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDateTime(movementToDelete.fechaHora)}
                  </span>
                </div>
                {movementToDelete.cliente && (
                  <p className="text-xs text-slate-600">
                    Cliente: <strong>{movementToDelete.cliente}</strong>
                  </p>
                )}
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {movementToDelete.items.length}{' '}
                    {movementToDelete.items.length === 1 ? 'producto' : 'productos'}
                  </span>
                  {movementToDelete.gananciaTotal > 0 && (
                    <span className="font-bold text-emerald-700 font-mono">
                      +{formatCurrency(movementToDelete.gananciaTotal)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revertStock}
                    onChange={(e) => setRevertStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-amber-950">
                      Restaurar el stock de los productos afectados
                    </span>
                    <span className="block text-xs text-amber-800 mt-0.5">
                      {revertStock
                        ? 'Se devolverán las unidades al inventario.'
                        : 'Solo se borrará el registro; el stock actual no cambiará.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMovementToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-movement"
                  onClick={confirmDeleteSingle}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">
                  Eliminar {selectedIds.length} Registros
                </h3>
              </div>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700">
                Vas a eliminar <strong>{selectedIds.length} registros</strong> del historial.
              </p>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkRevertStock}
                    onChange={(e) => setBulkRevertStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-amber-950">
                      Restaurar el stock de los productos afectados
                    </span>
                    <span className="block text-xs text-amber-800 mt-0.5">
                      {bulkRevertStock
                        ? 'Se revertirán las cantidades de todos los registros.'
                        : 'Solo se borrarán del historial; el stock actual no cambiará.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar {selectedIds.length}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};