/**
 * Generador de facturas en PDF usando jsPDF + jspdf-autotable.
 * Replica el formato de la plantilla proporcionada por Danos Electrical.
 *
 * Uso:
 *   import { generateInvoicePDF } from '../utils/pdf';
 *   generateInvoicePDF(movement, empresa);
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockMovement, CompanyInfo } from '../types';

/**
 * Formato de moneda dentro del PDF: 1,450.00 (sin símbolo, con 2 decimales)
 * Se pone "US$" en la cabecera de la columna.
 */
function fmtNum(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formato de fecha: 2026-07-25
 */
function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

export function generateInvoicePDF(movement: StockMovement, empresa: CompanyInfo): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ============================================================
  //  CABECERA
  // ============================================================
  const pageWidth = doc.internal.pageSize.getWidth();

  // Nombre empresa (arriba centro-izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(empresa.nombre || 'Empresa', 20, 25);

  // Teléfono / CIF / dirección
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yEmpresa = 30;
  if (empresa.telefono) {
    doc.text(`Tel: ${empresa.telefono}`, 20, yEmpresa);
    yEmpresa += 4.5;
  }
  if (empresa.cif) {
    doc.text(`CIF: ${empresa.cif}`, 20, yEmpresa);
    yEmpresa += 4.5;
  }
  if (empresa.direccion) {
    doc.text(empresa.direccion, 20, yEmpresa);
    yEmpresa += 4.5;
  }
  if (empresa.email) {
    doc.text(empresa.email, 20, yEmpresa);
    yEmpresa += 4.5;
  }

  // Título FACTURA (arriba derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FACTURA', pageWidth - 20, 25, { align: 'right' });

  // Fecha de factura (derecha)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fecha de factura', pageWidth - 20, 34, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(fmtDate(movement.fechaHora), pageWidth - 20, 39, { align: 'right' });

  // Número de factura (derecha)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Número de factura', pageWidth - 20, 47, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(movement.numeroFactura || '—', pageWidth - 20, 53, { align: 'right' });

  // ============================================================
  //  BLOQUE CLIENTE
  // ============================================================
  let yCliente = 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CLIENTE', 20, yCliente);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yCliente += 6;
  doc.text(`Nombre:`, 20, yCliente);
  doc.text(movement.cliente || '—', 45, yCliente);

  yCliente += 5;
  doc.text(`CI:`, 20, yCliente);
  doc.text(movement.clienteCI || '—', 45, yCliente);

  yCliente += 5;
  doc.text(`Dirección:`, 20, yCliente);
  doc.text(movement.clienteDireccion || '—', 45, yCliente);

  // ============================================================
  //  TABLA DE CONCEPTOS
  // ============================================================
  // Filas: productos + servicios extra
  type Row = [string, string, string, string];

  const rows: Row[] = [];

  // Productos
  movement.items.forEach((item) => {
    const total = item.cantidad * item.precioVentaUnitario;
    rows.push([
      item.productoNombre,
      String(item.cantidad),
      fmtNum(item.precioVentaUnitario),
      fmtNum(total),
    ]);
  });

  // Servicios extra
  if (movement.serviciosExtra && movement.serviciosExtra.length > 0) {
    movement.serviciosExtra.forEach((s) => {
      const total = s.cantidad * s.precioVenta;
      rows.push([
        s.nombre,
        String(s.cantidad),
        fmtNum(s.precioVenta),
        fmtNum(total),
      ]);
    });
  }

  autoTable(doc, {
    startY: yCliente + 8,
    head: [['DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNITARIO', 'TOTAL']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fontStyle: 'bold',
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
  });

  // ============================================================
  //  TOTALES
  // ============================================================
  // @ts-ignore — autoTable añade lastAutoTable al doc
  const finalY = (doc as any).lastAutoTable?.finalY || yCliente + 40;

  // Calcular subtotales
  const subtotalProductos = movement.items.reduce(
    (sum, i) => sum + i.cantidad * i.precioVentaUnitario,
    0
  );
  const subtotalServicios = (movement.serviciosExtra || []).reduce(
    (sum, s) => sum + s.cantidad * s.precioVenta,
    0
  );
  const baseImponible = subtotalProductos + subtotalServicios;
  const descuento = movement.descuento || 0;
  const subtotalConDescuento = Math.max(0, baseImponible - descuento);
  const total = subtotalConDescuento; // Sin IVA

  const totalBoxX = pageWidth - 20 - 75;
  const totalBoxY = finalY + 6;
  const totalBoxW = 75;

  // Caja de totales con recuadro
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  let yTotales = totalBoxY;
  const rowHeight = 7;

  // BASE IMPONIBLE
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.rect(totalBoxX, yTotales, totalBoxW, rowHeight);
  doc.text('BASE IMPONIBLE', totalBoxX + 2, yTotales + 5);
  doc.text(fmtNum(baseImponible), totalBoxX + totalBoxW - 2, yTotales + 5, { align: 'right' });

  // Descuento
  yTotales += rowHeight;
  doc.rect(totalBoxX, yTotales, totalBoxW, rowHeight);
  doc.text('Descuento', totalBoxX + 2, yTotales + 5);
  doc.text(fmtNum(descuento), totalBoxX + totalBoxW - 2, yTotales + 5, { align: 'right' });

  // Subtotal
  yTotales += rowHeight;
  doc.rect(totalBoxX, yTotales, totalBoxW, rowHeight);
  doc.text('SUBTOTAL', totalBoxX + 2, yTotales + 5);
  doc.text(fmtNum(subtotalConDescuento), totalBoxX + totalBoxW - 2, yTotales + 5, {
    align: 'right',
  });

  // TOTAL (destacado)
  yTotales += rowHeight;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(totalBoxX, yTotales, totalBoxW, rowHeight + 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', totalBoxX + 2, yTotales + 6);
  doc.text(`US$ ${fmtNum(total)}`, totalBoxX + totalBoxW - 2, yTotales + 6, { align: 'right' });

  // Reset color
  doc.setTextColor(0, 0, 0);

  // ============================================================
  //  FORMA DE PAGO
  // ============================================================
  const formaPagoY = totalBoxY + 3 * rowHeight + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Forma de pago: ${movement.formaPago || 'USD en efectivo'}`, 20, formaPagoY + 6);

  // Observaciones si hay
  if (movement.observaciones) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Observaciones: ${movement.observaciones}`, 20, formaPagoY + 13);
    doc.setTextColor(0, 0, 0);
  }

  // ============================================================
  //  GUARDAR
  // ============================================================
  const safeName = (movement.numeroFactura || 'factura').replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeCliente = (movement.cliente || 'cliente').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);
  const fileName = `${safeName}_${safeCliente}.pdf`;

  doc.save(fileName);
}