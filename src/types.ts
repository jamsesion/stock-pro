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
  fechaEntrada: string; // YYYY-MM-DD
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
  precioVentaPersonalizado?: number | null; // Opcional, si no se calcula sumando el precioVenta de los productos
  tiempoEstimadoHoras?: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 
  | 'SALIDA_INSTALACION' 
  | 'ENTRADA_STOCK' 
  | 'SALIDA_MANUAL' 
  | 'AJUSTE_INVENTARIO';

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
  fechaHora: string; // ISO 8601 string
  motivo: string; // e.g. "Instalación cliente Pérez"
  cliente?: string;
  plantillaId?: string;
  plantillaNombre?: string;
  items: StockMovementItem[];
  costoTotal: number;
  ingresoTotal: number;
  gananciaTotal: number; // ingresoTotal - costoTotal
  usuarioResponsable?: string;
  observaciones?: string;
}

export type DateRangePreset = 'all' | 'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export type ActiveTab = 'products' | 'templates' | 'movements' | 'profit' | 'alerts';
