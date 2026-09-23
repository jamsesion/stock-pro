/**
 * Helper para exportar datos a CSV compatible con Excel (con BOM UTF-8)
 * y con separador ';' (estándar en Excel español).
 */

export function exportToCsv(
  fileName: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (v: string | number): string => {
    const s = String(v ?? '');
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join(
    '\r\n'
  );

  // BOM UTF-8 → Excel respeta los acentos y la ñ
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}