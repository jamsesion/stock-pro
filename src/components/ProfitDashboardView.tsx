import React, { useState, useMemo } from 'react';
import { exportToCsv } from '../utils/csv';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Layers, 
  FileSpreadsheet, 
  Clock, 
  ArrowUpRight, 
  Filter,
  BarChart3,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { DateRangePreset, StockMovement } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface ProfitDashboardViewProps {
  movements: StockMovement[];
}

export const ProfitDashboardView: React.FC<ProfitDashboardViewProps> = ({ movements }) => {
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterMotivo, setFilterMotivo] = useState('');

  // Filter movements based on date range and only keep those with revenue/profit (e.g. installations and sales)
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return movements.filter((m) => {
      // Only installations and manual sales generate revenue / profit
      if (m.tipo !== 'SALIDA_INSTALACION' && m.tipo !== 'SALIDA_MANUAL') {
        return false;
      }

      if (filterMotivo && !m.motivo.toLowerCase().includes(filterMotivo.toLowerCase()) && 
          !(m.cliente && m.cliente.toLowerCase().includes(filterMotivo.toLowerCase()))) {
        return false;
      }

      const moveDate = new Date(m.fechaHora);
      const moveDateStr = m.fechaHora.split('T')[0];

      if (preset === 'today') {
        return moveDateStr === todayStr;
      }

      if (preset === 'last7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return moveDate >= sevenDaysAgo;
      }

      if (preset === 'thisMonth') {
        return moveDate.getFullYear() === now.getFullYear() && moveDate.getMonth() === now.getMonth();
      }

      if (preset === 'lastMonth') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          moveDate.getFullYear() === lastMonthDate.getFullYear() &&
          moveDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      if (preset === 'custom') {
        if (customStartDate && moveDateStr < customStartDate) return false;
        if (customEndDate && moveDateStr > customEndDate) return false;
      }

      return true;
    });
  }, [movements, preset, customStartDate, customEndDate, filterMotivo]);

  // Aggregate metrics
  const totalGanancia = filteredSales.reduce((sum, m) => sum + (m.gananciaTotal || 0), 0);
  const totalIngresos = filteredSales.reduce((sum, m) => sum + (m.ingresoTotal || 0), 0);
  const totalCostes = filteredSales.reduce((sum, m) => sum + (m.costoTotal || 0), 0);
  const margenPromedio = totalIngresos > 0 ? Math.round((totalGanancia / totalIngresos) * 1000) / 10 : 0;

  const exportProfitCSV = () => {
  const headers = [
    'Fecha y Hora', 'Motivo', 'Cliente', 'Plantilla',
    'Ingreso Bruto', 'Coste Materiales', 'Ganancia Neta', 'Margen %',
  ];

  const rows = filteredSales.map((m) => {
    const margin = m.ingresoTotal > 0
      ? Math.round((m.gananciaTotal / m.ingresoTotal) * 100)
      : 0;
    return [
      formatDateTime(m.fechaHora),
      m.motivo,
      m.cliente || '',
      m.plantillaNombre || 'Personalizada',
      m.ingresoTotal,
      m.costoTotal,
      m.gananciaTotal,
      margin,
    ];
  });

  exportToCsv(
    `informe_ganancias_${preset}_${new Date().toISOString().split('T')[0]}.csv`,
    headers,
    rows
  );
};

  return (
    <div className="space-y-5">
      {/* Top Filter Bar: Date Ranges */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Panel de Ganancias y Rentabilidad</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control exacto de margen por instalación y ganancia neta acumulada
          </p>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Todo el Histórico' },
            { id: 'today', label: 'Hoy' },
            { id: 'last7days', label: 'Últimos 7 días' },
            { id: 'thisMonth', label: 'Este Mes' },
            { id: 'lastMonth', label: 'Mes Anterior' },
            { id: 'custom', label: 'Personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as DateRangePreset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                preset === item.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={exportProfitCSV}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition ml-1"
            title="Exportar informe a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers if 'custom' is selected */}
      {preset === 'custom' && (
        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">Rango de fechas:</span>
          <div className="flex items-center gap-1">
            <span>Desde:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 rounded bg-white border border-slate-300 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span>Hasta:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 rounded bg-white border border-slate-300 text-xs"
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ganancia Acumulada */}
        <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm border border-emerald-800 relative overflow-hidden">
          <div className="absolute right-3 -bottom-2 text-emerald-800/40 pointer-events-none">
            <TrendingUp className="w-24 h-24" />
          </div>
          <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block mb-1">
            Ganancia Total Acumulada
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono">
            {formatCurrency(totalGanancia)}
          </div>
          <div className="mt-2 text-xs text-emerald-200 flex items-center gap-1 font-semibold">
            <span>Margen global:</span>
            <span className="bg-emerald-800 px-1.5 py-0.5 rounded text-white font-bold">
              {margenPromedio}%
            </span>
          </div>
        </div>

        {/* Ingresos Totales */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Ingresos Totales (PVP)
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(totalIngresos)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Facturación generada por instalaciones
          </p>
        </div>

        {/* Coste Materiales */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Coste de Materiales Consumidos
          </span>
          <div className="text-2xl font-black text-slate-700 font-mono">
            {formatCurrency(totalCostes)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Valor de compra de los artículos retirados
          </p>
        </div>

        {/* Instalaciones Realizadas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Instalaciones y Ventas
          </span>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {filteredSales.length}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Promedio: {filteredSales.length > 0 ? formatCurrency(totalGanancia / filteredSales.length) : '0,00 €'} / trabajo
          </p>
        </div>
      </div>

      {/* Breakdown per Sale/Installation (User Requirement: Muestra la ganancia por cada venta o instalación realizada) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Desglose de Ganancia por Instalación Realizada
            </h3>
            <p className="text-xs text-slate-500">
              Muestra el cálculo detallado de ingresos, coste de material y ganancia neta para cada trabajo
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredSales.length} {filteredSales.length === 1 ? 'registro' : 'registros'} en el periodo
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No hay ventas ni instalaciones en este rango de fechas</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Selecciona otro rango en los filtros superiores o registra una nueva instalación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-3">Motivo / Trabajo</th>
                  <th className="py-3 px-3">Cliente / Plantilla</th>
                  <th className="py-3 px-3 text-right">Ingreso Bruto</th>
                  <th className="py-3 px-3 text-right">Coste Materiales</th>
                  <th className="py-3 px-4 text-right">Ganancia Neta</th>
                  <th className="py-3 px-3 text-center">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSales.map((sale) => {
                  const margin = sale.ingresoTotal > 0 ? Math.round((sale.gananciaTotal / sale.ingresoTotal) * 100) : 0;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      {/* Fecha y hora exacta */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(sale.fechaHora)}</span>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div>{sale.motivo}</div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {sale.items.length} componentes consumidos
                        </div>
                      </td>

                      {/* Cliente / Plantilla */}
                      <td className="py-3 px-3">
                        {sale.cliente ? (
                          <div className="font-semibold text-slate-800">{sale.cliente}</div>
                        ) : (
                          <span className="text-slate-400 italic">No especificado</span>
                        )}
                        {sale.plantillaNombre && (
                          <span className="text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                            {sale.plantillaNombre}
                          </span>
                        )}
                      </td>

                      {/* Ingreso */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(sale.ingresoTotal)}
                      </td>

                      {/* Coste */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(sale.costoTotal)}
                      </td>

                      {/* Ganancia neta */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-emerald-700 text-sm sm:text-base">
                          +{formatCurrency(sale.gananciaTotal)}
                        </span>
                      </td>

                      {/* Margen */}
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          margin >= 30 ? 'bg-emerald-100 text-emerald-800' :
                          margin > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-800 text-sm">
                    TOTALES ACUMULADOS EN EL PERIODO
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-900">
                    {formatCurrency(totalIngresos)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(totalCostes)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-base">
                    +{formatCurrency(totalGanancia)}
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-slate-700">
                    {margenPromedio}% medio
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
