/**
 * Formateo de moneda en USD.
 * Formato elegido: US$ 1.450,00 (formato internacional con coma decimal).
 */
export function formatCurrency(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace('US$', 'US$ ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formato alternativo: 1.450,00 USD (sufijo)
 * Disponible por si en algún momento quieres cambiar.
 */
export function formatCurrencySuffix(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} USD`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function calculateProfit(
  precioVenta: number,
  precioCompra: number
): {
  ganancia: number;
  margenPorcentaje: number;
} {
  const ganancia = (precioVenta || 0) - (precioCompra || 0);
  const margenPorcentaje = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
  return {
    ganancia: Math.round(ganancia * 100) / 100,
    margenPorcentaje: Math.round(margenPorcentaje * 10) / 10,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper auxiliar: convierte cualquier valor a número seguro.
 * Útil para leer datos del .json que podrían estar corruptos.
 */
export function safeNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}