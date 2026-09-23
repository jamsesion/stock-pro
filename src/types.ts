export type UnitOfMeasure = 'ud' | 'metros' | 'kg' | 'litros' | 'cajas' | 'paquetes' | 'rollos';

export interface Product {
  id: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  proveedor: string;
  fechaEntrada: string;
  unidadMedida?: UnitOfMeasure | string;
  ubicacion?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  productoId: string;
  cantidad: number;
  notasItem?: string;
}

export interface InstallationTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  categoria?: string;
  items: TemplateItem[];
  precioVentaPersonalizado?: number | null;
  tiempoEstimadoHoras?: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementType =
  | 'SALIDA_INSTALACION'
  | 'ENTRADA_STOCK'
  | 'SALIDA_MANUAL'
  | 'AJUSTE_INVENTARIO';

/**
 * Servicio extra añadido manualmente a una instalación.
 * - precioVenta: lo que cobras al cliente (aparece en factura).
 * - coste: lo que te cuesta a ti (no aparece en factura, solo para margen interno).
 */
export interface ExtraService {
  id: string;
  nombre: string;
  cantidad: number;
  precioVenta: number;
  coste: number;
  notas?: string;
}

export interface StockMovementItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
  precioCompraUnitario: number;
  precioVentaUnitario: number;
  stockAnterior: number;
  stockPosterior: number;
}

export interface StockMovement {
  id: string;
  tipo: MovementType;
  fechaHora: string;
  motivo: string;
  // Datos del cliente (3 campos separados para la factura)
  cliente?: string;              // Nombre (compatibilidad y uso general)
  clienteCI?: string;            // Cédula de Identidad
  clienteDireccion?: string;     // Dirección
  numeroFactura?: string;
  formaPago?: string;            // Ej: "USD en efectivo"
  plantillaId?: string;
  plantillaNombre?: string;
  items: StockMovementItem[];
  serviciosExtra?: ExtraService[];
  descuento?: number;
  costoTotal: number;
  ingresoTotal: number;
  gananciaTotal: number;
  usuarioResponsable?: string;
  observaciones?: string;
}

/**
 * Datos de la empresa que aparecen en la cabecera de la factura.
 * Se guardan en el .json y son editables.
 */
export interface CompanyInfo {
  nombre: string;
  cif?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'last7days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export type ActiveTab = 'products' | 'templates' | 'movements' | 'profit' | 'alerts';