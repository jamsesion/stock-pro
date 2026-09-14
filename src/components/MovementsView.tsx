import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Wrench, 
  Search, 
  Clock, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  Trash2,
  AlertTriangle,
  X,
  RotateCcw,
  CheckSquare,
  Square,
  History
} from 'lucide-react';
import { StockMovement } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface MovementsViewProps {
  movements: StockMovement[];
  onNewStockEntry: () => void;
  onExecuteInstallation: () => void;
  onDeleteMovement: (movementId: string, revertStock: boolean) => void;
  onDeleteMultipleMovements: (movementIds: string[], revertStock: boolean) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  onNewStockEntry,
  onExecuteInstallation,
  onDeleteMovement,
  onDeleteMultipleMovements,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);

  // Multi-selection state for batch cleaning / deleting old movements
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkRevertStock, setBulkRevertStock] = useState(false);

  // Single item delete modal state
  const [movementToDelete, setMovementToDelete] = useState<StockMovement | null>(null);
  const [revertStock, setRevertStock] = useState(false);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch =
        m.motivo.toLowerCase().includes(search.toLowerCase()) ||
        (m.cliente && m.cliente.toLowerCase().includes(search.toLowerCase())) ||
        (m.plantillaNombre && m.plantillaNombre.toLowerCase().includes(search.toLowerCase())) ||
        (m.fechaHora && m.fechaHora.includes(search)) ||
        m.items.some((i) => i.productoNombre.toLowerCase().includes(search.toLowerCase()));

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
      'Fecha y Hora',
      'Tipo',
      'Motivo',
      'Cliente',
      'Plantilla',
      'Productos Consumidos/Añadidos',
      'Coste Total',
      'Ingreso Total',
      'Ganancia Total'
    ];

    const rows = filteredMovements.map((m) => {
      const itemsSummary = m.items.map(i => `${i.productoNombre}: ${i.cantidad} ${i.unidadMedida}`).join(' | ');
      return [
        m.id,
        `"${formatDateTime(m.fechaHora)}"`,
        m.tipo,
        `"${m.motivo.replace(/"/g, '""')}"`,
        `"${(m.cliente || '').replace(/"/g, '""')}"`,
        `"${(m.plantillaNombre || '').replace(/"/g, '""')}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        m.costoTotal,
        m.ingresoTotal,
        m.gananciaTotal
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registro_movimientos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInstallations = movements.filter((m) => m.tipo === 'SALIDA_INSTALACION').length;
  const totalEntries = movements.filter((m) => m.tipo === 'ENTRADA_STOCK').length;

  return (
    <div className="space-y-4">
      {/* Top action and filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-movements"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por motivo (ej: Instalación cliente Pérez), fecha o producto..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="select-filter-movement-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Todos los tipos ({movements.length})</option>
            <option value="SALIDA_INSTALACION">Instalaciones ({totalInstallations})</option>
            <option value="ENTRADA_STOCK">Entradas Proveedor ({totalEntries})</option>
            <option value="SALIDA_MANUAL">Salidas Manuales</option>
            <option value="AJUSTE_INVENTARIO">Ajustes de Inventario</option>
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

      {/* Multi-selection Toolbar (Appears when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <CheckSquare className="w-4 h-4 text-amber-600" />
            <span>{selectedIds.length} {selectedIds.length === 1 ? 'registro seleccionado' : 'registros seleccionados'}</span>
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
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar {selectedIds.length} {selectedIds.length === 1 ? 'registro' : 'registros'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Subheader with batch select toggle */}
        {filteredMovements.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
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
                <span>Seleccionar todos visibles ({filteredMovements.length})</span>
              </button>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <History className="w-3.5 h-3.5" />
              <span>Historial cronológico auditado</span>
            </div>
          </div>
        )}

        {filteredMovements.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No hay movimientos registrados</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Cada vez que realizas una instalación o recibes mercancía, se registra aquí con fecha y hora exacta.
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
                  className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-amber-50/30' : ''}`}
                >
                  {/* Row Header */}
                  <div
                    onClick={() => toggleExpand(movement.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    {/* Left: Checkbox, Icon, Date, Type & Motivo */}
                    <div className="flex items-start gap-3">
                      {/* Checkbox for selection */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(movement.id, e)}
                        className="mt-1 text-slate-400 hover:text-amber-600 p-0.5 rounded transition"
                        title={isSelected ? 'Deseleccionar' : 'Seleccionar registro'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>

                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isInstallation
                          ? 'bg-emerald-100 text-emerald-800'
                          : isEntry
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
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
                          <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isInstallation
                              ? 'bg-emerald-600 text-white'
                              : isEntry
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}>
                            {isInstallation
                              ? 'Instalación'
                              : isEntry
                              ? 'Entrada Stock'
                              : 'Salida / Ajuste'}
                          </span>

                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTime(movement.fechaHora)}
                          </span>
                        </div>

                        {/* Motivo del movimiento (Prominent per requirements) */}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                          <span>{movement.motivo}</span>
                          {movement.plantillaNombre && (
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Plantilla: {movement.plantillaNombre}
                            </span>
                          )}
                        </h4>

                        {movement.cliente && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            Cliente / Destino: <strong className="text-slate-800">{movement.cliente}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Items count, Financial Impact & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {movement.items.length} {movement.items.length === 1 ? 'producto' : 'productos'}
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

                      {/* Delete Button (Trash) */}
                      <button
                        type="button"
                        onClick={(e) => openDeleteSingle(movement, e)}
                        title="Eliminar este movimiento o instalación"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand / Collapse Chevron */}
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Desglose de productos y unidades afectadas:
                        </div>
                        <button
                          type="button"
                          onClick={() => openDeleteSingle(movement)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar este registro</span>
                        </button>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">Producto</th>
                              <th className="py-2 px-3 text-center">Cantidad</th>
                              <th className="py-2 px-3 text-center">Stock Antes → Después</th>
                              <th className="py-2 px-3 text-right">Precio Unitario</th>
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
                                  {isEntry ? '+' : '-'}{item.cantidad} {item.unidadMedida}
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-slate-500">
                                  {item.stockAnterior} → <strong className="text-slate-900">{item.stockPosterior}</strong>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">
                                  {formatCurrency(isEntry ? item.precioCompraUnitario : item.precioVentaUnitario)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(item.cantidad * (isEntry ? item.precioCompraUnitario : item.precioVentaUnitario))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

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

      {/* Delete Single Movement Modal */}
      {movementToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Eliminar Registro de Movimiento</h3>
              </div>
              <button
                onClick={() => setMovementToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700">
                ¿Estás seguro de que deseas eliminar este registro del historial?
              </p>

              {/* Movement Summary Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{movementToDelete.motivo}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatDateTime(movementToDelete.fechaHora)}
                  </span>
                </div>
                {movementToDelete.cliente && (
                  <p className="text-xs text-slate-600">Cliente: <strong>{movementToDelete.cliente}</strong></p>
                )}
                {movementToDelete.plantillaNombre && (
                  <p className="text-xs text-slate-600">Plantilla: <strong>{movementToDelete.plantillaNombre}</strong></p>
                )}
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {movementToDelete.items.length} {movementToDelete.items.length === 1 ? 'producto' : 'productos'} afectados
                  </span>
                  {movementToDelete.gananciaTotal > 0 && (
                    <span className="font-bold text-emerald-700 font-mono">
                      Ganancia: +{formatCurrency(movementToDelete.gananciaTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Option to revert stock or not */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
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
                        ? 'Se devolverán las unidades descontadas al inventario disponible.'
                        : 'Solo se borrará el registro del historial (el stock actual de los productos no cambiará). Recomendado para limpiar instalaciones viejas que ya se ejecutaron.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Buttons */}
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
                  <span>Eliminar Registro</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Eliminar {selectedIds.length} Movimientos / Instalaciones</h3>
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
                Vas a eliminar <strong className="text-slate-900">{selectedIds.length} registros</strong> seleccionados del historial. Esta acción eliminará los registros de los listados y del panel de ganancias.
              </p>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
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
                        ? 'Se revertirán las cantidades de todos los registros seleccionados en el stock actual.'
                        : 'Solo se borrarán del historial. Las cantidades actuales de stock se mantendrán intactas (ideal para purgar instalaciones viejas).'}
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
                  <span>Eliminar {selectedIds.length} Registros</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
