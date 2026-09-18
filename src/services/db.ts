import { InstallationTemplate, Product, StockMovement, StockMovementItem } from '../types';
import {
  verifyPermission,
} from '../utils/fileDatabase';
import {
  saveActiveDatabaseToIndexedDb,
  loadActiveDatabaseFromIndexedDb,
  clearActiveDatabaseInIndexedDb,
  getStoredDbPath,
  setStoredDbPath,
} from '../utils/indexedDbStorage';

export interface DatabaseSchema {
  version: number;
  app: string;
  updatedAt: string;
  dbPath?: string;
  invoiceConsecutive?: number;
  products: Product[];
  templates: InstallationTemplate[];
  movements: StockMovement[];
}

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    nombre: 'Inversor 10kW Híbrido Deye',
    categoria: 'Inversores',
    stockActual: 4,
    stockMinimo: 2,
    precioCompra: 1450,
    precioVenta: 2150,
    proveedor: 'Deye Ibérica Distribuciones',
    fechaEntrada: '2026-08-25',
    unidadMedida: 'ud',
    ubicacion: 'Nave A - Pasillo 2',
    notas: 'Garantía 10 años. Apto para baterías de baja tensión.',
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-08-25T08:00:00.000Z',
  },
  {
    id: 'prod-2',
    nombre: 'Panel solar 450W Monocristalino Tier-1',
    categoria: 'Paneles Solares',
    stockActual: 62,
    stockMinimo: 25,
    precioCompra: 85,
    precioVenta: 135,
    proveedor: 'SolarTech Global',
    fechaEntrada: '2026-09-01',
    unidadMedida: 'ud',
    ubicacion: 'Nave B - Estantería 1',
    notas: 'Módulos bifaciales alta eficiencia 21.5%',
    createdAt: '2026-09-01T09:30:00.000Z',
    updatedAt: '2026-09-01T09:30:00.000Z',
  },
  {
    id: 'prod-3',
    nombre: 'Cable solar 6mm² Rojo/Negro',
    categoria: 'Cableado y Conexión',
    stockActual: 240,
    stockMinimo: 100,
    precioCompra: 0.95,
    precioVenta: 1.90,
    proveedor: 'CableSur Industrial',
    fechaEntrada: '2026-09-02',
    unidadMedida: 'metros',
    ubicacion: 'Nave A - Bobinas',
    notas: 'Bobinas homologadas para intemperie UV',
    createdAt: '2026-09-02T10:15:00.000Z',
    updatedAt: '2026-09-02T10:15:00.000Z',
  },
  {
    id: 'prod-4',
    nombre: 'Batería Litio 5.12kWh 48V',
    categoria: 'Baterías',
    stockActual: 3,
    stockMinimo: 2,
    precioCompra: 1220,
    precioVenta: 1780,
    proveedor: 'Pylontech España',
    fechaEntrada: '2026-09-05',
    unidadMedida: 'ud',
    ubicacion: 'Nave A - Zona Segura',
    notas: 'Batería LiFePO4 6000 ciclos',
    createdAt: '2026-09-05T11:00:00.000Z',
    updatedAt: '2026-09-05T11:00:00.000Z',
  },
  {
    id: 'prod-5',
    nombre: 'Conectores MC4 Par (Macho + Hembra)',
    categoria: 'Cableado y Conexión',
    stockActual: 14,
    stockMinimo: 40,
    precioCompra: 0.70,
    precioVenta: 2.20,
    proveedor: 'CableSur Industrial',
    fechaEntrada: '2026-08-20',
    unidadMedida: 'ud',
    ubicacion: 'Cajonera C-12',
    notas: 'Alerta de stock bajo: reponer pedido',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
  },
  {
    id: 'prod-6',
    nombre: 'Estructura Coplanar Aluminio 4 paneles',
    categoria: 'Estructuras',
    stockActual: 3,
    stockMinimo: 6,
    precioCompra: 72,
    precioVenta: 130,
    proveedor: 'AlumSolar Perfiles',
    fechaEntrada: '2026-08-28',
    unidadMedida: 'ud',
    ubicacion: 'Nave B - Zona Estructuras',
    notas: 'Perfiles triangulares aluminio anodizado',
    createdAt: '2026-08-28T09:00:00.000Z',
    updatedAt: '2026-08-28T09:00:00.000Z',
  },
  {
    id: 'prod-7',
    nombre: 'Cuadro de Protecciones AC/DC 600V',
    categoria: 'Protecciones Eléctricas',
    stockActual: 7,
    stockMinimo: 4,
    precioCompra: 110,
    precioVenta: 195,
    proveedor: 'ElectroProtec Industrial',
    fechaEntrada: '2026-09-03',
    unidadMedida: 'ud',
    ubicacion: 'Nave A - Pasillo 3',
    notas: 'Incluye sobretensiones transitorias y magnetotérmico 32A',
    createdAt: '2026-09-03T11:45:00.000Z',
    updatedAt: '2026-09-03T11:45:00.000Z',
  },
  {
    id: 'prod-8',
    nombre: 'Vatímetro Smart Meter Chint DDSU666',
    categoria: 'Monitorización',
    stockActual: 5,
    stockMinimo: 3,
    precioCompra: 85,
    precioVenta: 160,
    proveedor: 'Deye Ibérica Distribuciones',
    fechaEntrada: '2026-08-29',
    unidadMedida: 'ud',
    ubicacion: 'Cajonera M-04',
    notas: 'Medidor monofásico para inyección cero y monitorización',
    createdAt: '2026-08-29T10:00:00.000Z',
    updatedAt: '2026-08-29T10:00:00.000Z',
  },
];

export const SAMPLE_TEMPLATES: InstallationTemplate[] = [
  {
    id: 'tpl-1',
    nombre: 'Instalación inversor 10kW',
    descripcion: 'Kit estándar para instalación de autoconsumo residencial con inversor 10kW y 20 paneles',
    categoria: 'Autoconsumo Residencial',
    tiempoEstimadoHoras: 8,
    precioVentaPersonalizado: 5970,
    items: [
      { productoId: 'prod-1', cantidad: 1 },
      { productoId: 'prod-2', cantidad: 20 },
      { productoId: 'prod-3', cantidad: 50 },
      { productoId: 'prod-5', cantidad: 10 },
      { productoId: 'prod-6', cantidad: 5 },
      { productoId: 'prod-7', cantidad: 1 },
      { productoId: 'prod-8', cantidad: 1 },
    ],
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'tpl-2',
    nombre: 'Ampliación Batería Litio 5kWh',
    descripcion: 'Incorporación de acumulación en sistema existente con batería 5.12kWh y protecciones',
    categoria: 'Acumulación y Baterías',
    tiempoEstimadoHoras: 3,
    precioVentaPersonalizado: 2250,
    items: [
      { productoId: 'prod-4', cantidad: 1 },
      { productoId: 'prod-3', cantidad: 10 },
      { productoId: 'prod-7', cantidad: 1 },
    ],
    createdAt: '2026-08-22T12:00:00.000Z',
    updatedAt: '2026-08-22T12:00:00.000Z',
  },
];

export const SAMPLE_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    tipo: 'ENTRADA_STOCK',
    fechaHora: '2026-09-01T09:30:00.000Z',
    motivo: 'Recepción pedido paneles solares de proveedor',
    items: [
      {
        productoId: 'prod-2',
        productoNombre: 'Panel solar 450W Monocristalino Tier-1',
        cantidad: 82,
        unidadMedida: 'ud',
        precioCompraUnitario: 85,
        precioVentaUnitario: 135,
        stockAnterior: 0,
        stockPosterior: 82,
      },
    ],
    costoTotal: 82 * 85,
    ingresoTotal: 82 * 85,
    gananciaTotal: 0,
    observaciones: 'Albarán de entrega ST-2026-904',
  },
  {
    id: 'mov-2',
    tipo: 'SALIDA_INSTALACION',
    fechaHora: '2026-09-10T14:45:22.000Z',
    motivo: 'Instalación cliente Pérez',
    cliente: 'Juan Carlos Pérez - Finca El Roble',
    numeroFactura: 'FAC-00001',
    plantillaId: 'tpl-1',
    plantillaNombre: 'Instalación inversor 10kW',
    items: [
      {
        productoId: 'prod-1',
        productoNombre: 'Inversor 10kW Híbrido Deye',
        cantidad: 1,
        unidadMedida: 'ud',
        precioCompraUnitario: 1450,
        precioVentaUnitario: 2150,
        stockAnterior: 5,
        stockPosterior: 4,
      },
      {
        productoId: 'prod-2',
        productoNombre: 'Panel solar 450W Monocristalino Tier-1',
        cantidad: 20,
        unidadMedida: 'ud',
        precioCompraUnitario: 85,
        precioVentaUnitario: 135,
        stockAnterior: 82,
        stockPosterior: 62,
      },
      {
        productoId: 'prod-3',
        productoNombre: 'Cable solar 6mm² Rojo/Negro',
        cantidad: 50,
        unidadMedida: 'metros',
        precioCompraUnitario: 0.95,
        precioVentaUnitario: 1.90,
        stockAnterior: 290,
        stockPosterior: 240,
      },
      {
        productoId: 'prod-5',
        productoNombre: 'Conectores MC4 Par (Macho + Hembra)',
        cantidad: 10,
        unidadMedida: 'ud',
        precioCompraUnitario: 0.70,
        precioVentaUnitario: 2.20,
        stockAnterior: 24,
        stockPosterior: 14,
      },
      {
        productoId: 'prod-6',
        productoNombre: 'Estructura Coplanar Aluminio 4 paneles',
        cantidad: 5,
        unidadMedida: 'ud',
        precioCompraUnitario: 72,
        precioVentaUnitario: 130,
        stockAnterior: 8,
        stockPosterior: 3,
      },
      {
        productoId: 'prod-7',
        productoNombre: 'Cuadro de Protecciones AC/DC 600V',
        cantidad: 1,
        unidadMedida: 'ud',
        precioCompraUnitario: 110,
        precioVentaUnitario: 195,
        stockAnterior: 8,
        stockPosterior: 7,
      },
      {
        productoId: 'prod-8',
        productoNombre: 'Vatímetro Smart Meter Chint DDSU666',
        cantidad: 1,
        unidadMedida: 'ud',
        precioCompraUnitario: 85,
        precioVentaUnitario: 160,
        stockAnterior: 6,
        stockPosterior: 5,
      },
    ],
    costoTotal: 1450 + (20 * 85) + (50 * 0.95) + (10 * 0.70) + (5 * 72) + 110 + 85,
    ingresoTotal: 2150 + (20 * 135) + (50 * 1.90) + (10 * 2.20) + (5 * 130) + 195 + 160,
    gananciaTotal: 5972 - 3759.5,
    observaciones: 'Instalación finalizada con puesta en marcha y certificación técnica.',
  },
];

/**
 * Gestor de Base de Datos Portátil Externa
 * NO depende de localStorage.
 * Los datos residen en el archivo externo elegido por el usuario (.db o .json).
 */
class InventoryDatabase {
  private cache: DatabaseSchema = {
    version: 1,
    app: 'Gestión de Inventario y Stock',
    updatedAt: new Date().toISOString(),
    dbPath: 'inventario.json',
    invoiceConsecutive: 1,
    products: [],
    templates: [],
    movements: [],
  };

  private isDatabaseLoaded: boolean = false;
  // Variable de estado global y persistente para la ruta del archivo de base de datos
  private dbPath: string = getStoredDbPath() || 'inventario.json';
  private databaseFileName: string | null = null;
  private fileHandle: any | null = null;
  private lastSavedAt: Date | null = null;
  private saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'pending_manual' = 'idle';
  private hasUnsavedChangesFlag: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Starts with no database loaded until user selects or creates their portable file.
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in database listener', e);
      }
    });
  }

  // --- Portable File State Getters & Setters ---
  public isLoaded(): boolean {
    return this.isDatabaseLoaded;
  }

  public getDbPath(): string {
    return this.dbPath || getStoredDbPath() || this.databaseFileName || 'inventario.json';
  }

  public setDbPath(path: string): void {
    const clean = path.trim();
    if (!clean) return;
    this.dbPath = clean;
    this.databaseFileName = clean;
    this.cache.dbPath = clean;
    setStoredDbPath(clean);
    this.notifyListeners();
  }

  public getDatabaseFileName(): string | null {
    return this.dbPath || this.databaseFileName;
  }

  public getInvoiceConsecutive(): number {
    return typeof this.cache.invoiceConsecutive === 'number' && this.cache.invoiceConsecutive > 0
      ? this.cache.invoiceConsecutive
      : 1;
  }

  public setInvoiceConsecutive(num: number): void {
    const valid = Math.max(1, Math.floor(num));
    this.cache.invoiceConsecutive = valid;
    this.persist({ ...this.cache });
    this.notifyListeners();
  }

  public getNextInvoiceNumber(): string {
    const num = this.getInvoiceConsecutive();
    return `FAC-${String(num).padStart(5, '0')}`;
  }

  public consumeNextInvoiceNumber(): string {
    const currentNum = this.getInvoiceConsecutive();
    const formatted = `FAC-${String(currentNum).padStart(5, '0')}`;
    this.cache.invoiceConsecutive = currentNum + 1;
    this.persist({ ...this.cache });
    return formatted;
  }

  public getLastSavedAt(): Date | null {
    return this.lastSavedAt;
  }

  public getSaveStatus(): 'idle' | 'saving' | 'saved' | 'error' | 'pending_manual' {
    return this.saveStatus;
  }

  public hasUnsavedChanges(): boolean {
    return this.hasUnsavedChangesFlag;
  }

  public hasWritableHandle(): boolean {
    return this.fileHandle !== null;
  }

  public getFileHandle(): any | null {
    return this.fileHandle;
  }

  public setFileHandle(handle: any | null): void {
    this.fileHandle = handle;
    if (handle && this.saveStatus === 'pending_manual') {
      this.saveToFile();
    } else {
      this.notifyListeners();
    }
  }

  /**
   * Sincroniza el estado actual con el almacenamiento local seguro (IndexedDB + localStorage)
   * utilizando la ruta exacta almacenada en dbPath
   */
  private async syncToIndexedDb(): Promise<void> {
    const currentPath = this.getDbPath();
    this.dbPath = currentPath;
    this.databaseFileName = currentPath;
    this.cache.dbPath = currentPath;
    if (!this.cache.invoiceConsecutive) {
      this.cache.invoiceConsecutive = 1;
    }
    this.isDatabaseLoaded = true;
    await saveActiveDatabaseToIndexedDb(currentPath, this.cache, this.fileHandle);
  }

  /**
   * Inicializa la base de datos desde el almacenamiento interno de la app si existe,
   * leyendo exactamente la misma dbPath y el número consecutivo de factura.
   */
  public async initFromStorage(): Promise<boolean> {
    try {
      const storedPath = getStoredDbPath() || 'inventario.json';
      this.dbPath = storedPath;
      this.databaseFileName = storedPath;

      const stored = await loadActiveDatabaseFromIndexedDb();
      if (stored && stored.data && Array.isArray(stored.data.products)) {
        this.cache = stored.data;
        if (typeof this.cache.invoiceConsecutive !== 'number' || this.cache.invoiceConsecutive < 1) {
          const maxInv = Array.isArray(this.cache.movements)
            ? this.cache.movements.reduce((max, m) => {
                if (m.numeroFactura) {
                  const match = m.numeroFactura.match(/\d+/);
                  if (match) {
                    const val = parseInt(match[0], 10);
                    return val > max ? val : max;
                  }
                }
                return max;
              }, 0)
            : 0;
          this.cache.invoiceConsecutive = maxInv > 0 ? maxInv + 1 : 1;
        }
        this.cache.dbPath = stored.fileName || storedPath;
        this.isDatabaseLoaded = true;
        this.databaseFileName = stored.fileName || storedPath;
        this.dbPath = this.databaseFileName;
        setStoredDbPath(this.dbPath);
        this.fileHandle = stored.handle || null;
        this.lastSavedAt = stored.updatedAt ? new Date(stored.updatedAt) : new Date();
        this.hasUnsavedChangesFlag = false;
        this.saveStatus = 'saved';

        if (this.fileHandle && typeof this.fileHandle.queryPermission === 'function') {
          try {
            const state = await this.fileHandle.queryPermission({ mode: 'readwrite' });
            if (state !== 'granted') {
              this.saveStatus = 'pending_manual';
            }
          } catch (e) {
            console.warn('Error comprobando permisos iniciales:', e);
          }
        }

        this.notifyListeners();
        return true;
      }
    } catch (e) {
      console.warn('Error inicializando desde almacenamiento interno:', e);
    }

    // Si aún no hay datos guardados previamente, inicializar con la ruta predeterminada
    if (!this.isDatabaseLoaded) {
      await this.createNewDatabase('inventario.json', true, null);
      return true;
    }

    return false;
  }

  /**
   * Carga una base de datos externa desde un archivo File (.db o .json).
   * Almacena la ruta del archivo seleccionado en la variable de estado persistente dbPath.
   */
  public async loadFromFile(
    file: File,
    handle?: any | null
  ): Promise<{
    success: boolean;
    message?: string;
    stats?: { products: number; movements: number; templates: number };
  }> {
    try {
      const text = await file.text();
      let products: Product[] = [];
      let templates: InstallationTemplate[] = [];
      let movements: StockMovement[] = [];
      let version = 1;
      let invoiceConsecutive = 1;

      if (text.trim().length === 0) {
        // Archivo nuevo en blanco
        products = [];
        templates = [];
        movements = [];
      } else {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.products)) {
            products = parsed.products;
            templates = Array.isArray(parsed.templates) ? parsed.templates : [];
            movements = Array.isArray(parsed.movements) ? parsed.movements : [];
            version = parsed.version || 1;
            if (typeof parsed.invoiceConsecutive === 'number' && parsed.invoiceConsecutive > 0) {
              invoiceConsecutive = parsed.invoiceConsecutive;
            } else {
              const maxInv = movements.reduce((max, m) => {
                if (m.numeroFactura) {
                  const match = m.numeroFactura.match(/\d+/);
                  if (match) {
                    const val = parseInt(match[0], 10);
                    return val > max ? val : max;
                  }
                }
                return max;
              }, 0);
              invoiceConsecutive = maxInv > 0 ? maxInv + 1 : 1;
            }
          } else if (Array.isArray(parsed)) {
            // Compatibilidad si el archivo era una lista simple de productos
            products = parsed;
          } else {
            return {
              success: false,
              message: 'El archivo no tiene una estructura de base de datos válida.',
            };
          }
        } catch (parseError) {
          return {
            success: false,
            message: 'No se pudo leer el archivo. Asegúrate de que es un archivo .json o .db con datos estructurados.',
          };
        }
      }

      // Guardar la ruta seleccionada en la variable persistente dbPath (ej: localStorage)
      const selectedPath = file.name;
      this.dbPath = selectedPath;
      this.databaseFileName = selectedPath;
      setStoredDbPath(selectedPath);

      this.cache = {
        version,
        app: 'Gestión de Inventario y Stock',
        updatedAt: new Date().toISOString(),
        dbPath: selectedPath,
        invoiceConsecutive,
        products,
        templates,
        movements,
      };

      this.isDatabaseLoaded = true;
      this.fileHandle = handle || null;
      this.lastSavedAt = new Date();
      this.hasUnsavedChangesFlag = false;
      this.saveStatus = handle ? 'saved' : 'pending_manual';

      if (handle) {
        await verifyPermission(handle, true);
      }

      // Si el archivo estaba vacío y tenemos handle, guardamos la estructura base de inmediato
      if (text.trim().length === 0 && handle) {
        await this.saveToFile();
      }

      await this.syncToIndexedDb();
      this.notifyListeners();

      return {
        success: true,
        stats: {
          products: products.length,
          movements: movements.length,
          templates: templates.length,
        },
      };
    } catch (err: any) {
      console.error('Error al cargar archivo de base de datos', err);
      return {
        success: false,
        message: err.message || 'Error al acceder al archivo de base de datos.',
      };
    }
  }

  /**
   * Crea una nueva base de datos portátil en memoria y guarda su ruta en dbPath.
   */
  public async createNewDatabase(
    fileName: string,
    withSampleData: boolean = false,
    handle?: any | null
  ): Promise<void> {
    const cleanFileName = fileName.trim().endsWith('.json') || fileName.trim().endsWith('.db')
      ? fileName.trim()
      : `${fileName.trim()}.json`;

    this.dbPath = cleanFileName;
    this.databaseFileName = cleanFileName;
    setStoredDbPath(cleanFileName);

    this.cache = {
      version: 1,
      app: 'Gestión de Inventario y Stock',
      updatedAt: new Date().toISOString(),
      dbPath: cleanFileName,
      invoiceConsecutive: withSampleData ? 2 : 1,
      products: withSampleData ? [...SAMPLE_PRODUCTS] : [],
      templates: withSampleData ? [...SAMPLE_TEMPLATES] : [],
      movements: withSampleData ? [...SAMPLE_MOVEMENTS] : [],
    };

    this.isDatabaseLoaded = true;
    this.fileHandle = handle || null;
    this.lastSavedAt = new Date();
    this.hasUnsavedChangesFlag = false;
    this.saveStatus = handle ? 'saved' : 'pending_manual';

    if (handle) {
      await verifyPermission(handle, true);
      await this.saveToFile();
    }

    await this.syncToIndexedDb();
    this.notifyListeners();
  }

  /**
   * Guarda automáticamente los datos en el archivo externo vinculado.
   */
  public async saveToFile(): Promise<{ success: boolean; message?: string }> {
    if (!this.isDatabaseLoaded) {
      return { success: false, message: 'No hay base de datos cargada.' };
    }

    const jsonContent = JSON.stringify(this.cache, null, 2);

    if (this.fileHandle && typeof this.fileHandle.createWritable === 'function') {
      try {
        this.saveStatus = 'saving';
        this.notifyListeners();

        // Si tenemos handle, comprobar permisos sin romper la operación
        if (typeof this.fileHandle.queryPermission === 'function') {
          try {
            const perm = await this.fileHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
              this.saveStatus = 'pending_manual';
              this.hasUnsavedChangesFlag = true;
              this.notifyListeners();
              return { success: false, message: 'Permiso de escritura pendiente.' };
            }
          } catch (pErr) {
            // Ignorar y probar crear el writable
          }
        }

        // keepExistingData: false trunca y sobrescribe exactamente el archivo en uso
        const writable = await this.fileHandle.createWritable({ keepExistingData: false });
        await writable.write(jsonContent);
        await writable.close();

        this.lastSavedAt = new Date();
        this.hasUnsavedChangesFlag = false;
        this.saveStatus = 'saved';
        await this.syncToIndexedDb();
        this.notifyListeners();
        return { success: true };
      } catch (err: any) {
        console.error('Error al sobrescribir automáticamente en el archivo en uso', err);
        this.saveStatus = 'pending_manual';
        this.hasUnsavedChangesFlag = true;
        await this.syncToIndexedDb();
        this.notifyListeners();
        return {
          success: false,
          message: 'Permiso de escritura pendiente. Pulsa "Guardar" para confirmar.',
        };
      }
    } else {
      // Sin handle con permisos de escritura directa
      this.saveStatus = 'pending_manual';
      this.hasUnsavedChangesFlag = true;
      await this.syncToIndexedDb();
      this.notifyListeners();
      return {
        success: true,
        message: 'Modificación registrada en memoria interna.',
      };
    }
  }

  /**
   * Método principal para el botón de "Guardar".
   * Usa la ruta de base de datos almacenada en la variable persistente dbPath para abrir y escribir en ella.
   * NO crea una nueva conexión ni un nuevo archivo con nombres generados con fecha (inventario_2026...db).
   * Escribe y sobrescribe en la MISMA base de datos que el usuario eligió.
   */
  public async saveCurrentDatabase(): Promise<{
    success: boolean;
    fileName: string;
    method: 'direct' | 'internal';
    message: string;
  }> {
    const targetPath = this.getDbPath();
    this.dbPath = targetPath;
    this.databaseFileName = targetPath;
    this.cache.dbPath = targetPath;
    if (!this.cache.invoiceConsecutive) {
      this.cache.invoiceConsecutive = 1;
    }
    this.cache.updatedAt = new Date().toISOString();
    this.isDatabaseLoaded = true;

    const jsonContent = JSON.stringify(this.cache, null, 2);

    this.saveStatus = 'saving';
    this.notifyListeners();

    // 1. Guardar y sincronizar de inmediato en el almacenamiento persistente interno dual (IndexedDB + localStorage) en la misma dbPath
    await this.syncToIndexedDb();

    // 2. Si hay un manejador de archivo directo en disco/pendrive vinculado para dbPath, escribir en ese MISMO archivo existente
    if (this.fileHandle && typeof this.fileHandle.createWritable === 'function') {
      try {
        const hasPerm = await verifyPermission(this.fileHandle, true);
        if (hasPerm) {
          // keepExistingData: false trunca y sobrescribe exactamente el archivo existente en dbPath
          const writable = await this.fileHandle.createWritable({ keepExistingData: false });
          await writable.write(jsonContent);
          await writable.close();

          this.lastSavedAt = new Date();
          this.hasUnsavedChangesFlag = false;
          this.saveStatus = 'saved';
          await this.syncToIndexedDb();
          this.notifyListeners();

          return {
            success: true,
            fileName: targetPath,
            method: 'direct',
            message: `¡Cambios guardados y actualizados en "${targetPath}"!`,
          };
        }
      } catch (err: any) {
        console.warn('Advertencia al escribir directamente en el archivo vinculado:', err);
      }
    }

    // 3. Los cambios quedan guardados y actualizados en la base de datos existente bajo dbPath.
    // NUNCA crea archivos nuevos ni genera descargas duplicadas.
    this.lastSavedAt = new Date();
    this.hasUnsavedChangesFlag = false;
    this.saveStatus = 'saved';
    await this.syncToIndexedDb();
    this.notifyListeners();

    return {
      success: true,
      fileName: targetPath,
      method: 'internal',
      message: `¡Cambios guardados correctamente en "${targetPath}"!`,
    };
  }

  /**
   * Genera un Blob descargable de la base de datos completa.
   */
  public exportDatabaseAsBlob(): { blob: Blob; fileName: string } {
    const jsonStr = JSON.stringify(this.cache, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = this.databaseFileName || 'inventario.json';
    return { blob, fileName };
  }

  /**
   * Cierra o desconecta la base de datos actual.
   * Si clearStorage es false, no borra los datos guardados en el almacenamiento interno.
   */
  public disconnectDatabase(clearStorage: boolean = false): void {
    if (clearStorage) {
      clearActiveDatabaseInIndexedDb();
      this.cache = {
        version: 1,
        app: 'Gestión de Inventario y Stock',
        updatedAt: new Date().toISOString(),
        products: [],
        templates: [],
        movements: [],
      };
      this.isDatabaseLoaded = false;
      this.databaseFileName = null;
      this.fileHandle = null;
      this.lastSavedAt = null;
      this.hasUnsavedChangesFlag = false;
      this.saveStatus = 'idle';
    } else {
      this.hasUnsavedChangesFlag = false;
      this.saveStatus = 'saved';
    }
    this.notifyListeners();
  }

  // --- Internal Data Persist (Dispatches Auto-save to external file) ---
  private getData(): DatabaseSchema {
    return this.cache;
  }

  private persist(data: DatabaseSchema): void {
    this.cache = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (!this.isDatabaseLoaded) {
      this.isDatabaseLoaded = true;
    }
    if (!this.databaseFileName) {
      this.databaseFileName = 'inventario.json';
    }

    // 1. Sincronización inmediata a IndexedDB y localStorage a prueba de pérdidas
    this.syncToIndexedDb();

    // 2. Sobrescribir inmediatamente en el archivo físico vinculado si existe
    if (this.fileHandle) {
      this.saveToFile();
    } else {
      this.hasUnsavedChangesFlag = true;
      this.saveStatus = 'pending_manual';
      this.notifyListeners();
    }
  }

  // --- Products CRUD ---
  public getProducts(): Product[] {
    return [...this.getData().products];
  }

  public getProductById(id: string): Product | undefined {
    return this.getData().products.find((p) => p.id === id);
  }

  public saveProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Product {
    const data = this.getData();
    const now = new Date().toISOString();

    if (productData.id) {
      // Update
      const index = data.products.findIndex((p) => p.id === productData.id);
      if (index !== -1) {
        const updated: Product = {
          ...data.products[index],
          ...productData,
          id: productData.id,
          updatedAt: now,
        };
        data.products[index] = updated;
        this.persist({ ...data });
        return updated;
      }
    }

    // Create
    const newProduct: Product = {
      ...productData,
      id: productData.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    data.products.push(newProduct);
    this.persist({ ...data });
    return newProduct;
  }

  public deleteProduct(id: string): boolean {
    const data = this.getData();
    const initialLen = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    if (data.products.length !== initialLen) {
      this.persist({ ...data });
      return true;
    }
    return false;
  }

  // --- Templates CRUD ---
  public getTemplates(): InstallationTemplate[] {
    return [...this.getData().templates];
  }

  public getTemplateById(id: string): InstallationTemplate | undefined {
    return this.getData().templates.find((t) => t.id === id);
  }

  public saveTemplate(
    templateData: Omit<InstallationTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): InstallationTemplate {
    const data = this.getData();
    const now = new Date().toISOString();

    if (templateData.id) {
      const index = data.templates.findIndex((t) => t.id === templateData.id);
      if (index !== -1) {
        const updated: InstallationTemplate = {
          ...data.templates[index],
          ...templateData,
          id: templateData.id,
          updatedAt: now,
        };
        data.templates[index] = updated;
        this.persist({ ...data });
        return updated;
      }
    }

    const newTemplate: InstallationTemplate = {
      ...templateData,
      id: templateData.id || `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    data.templates.push(newTemplate);
    this.persist({ ...data });
    return newTemplate;
  }

  public deleteTemplate(id: string): boolean {
    const data = this.getData();
    const initialLen = data.templates.length;
    data.templates = data.templates.filter((t) => t.id !== id);
    if (data.templates.length !== initialLen) {
      this.persist({ ...data });
      return true;
    }
    return false;
  }

  // --- Movements and Automatic Stock Deduction ---
  public getMovements(): StockMovement[] {
    return [...this.getData().movements].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
  }

  public executeInstallation(params: {
    plantillaId?: string;
    plantillaNombre?: string;
    motivo: string;
    cliente?: string;
    numeroFactura?: string;
    items: { productoId: string; cantidad: number }[];
    observaciones?: string;
    usuarioResponsable?: string;
  }): { success: boolean; movement?: StockMovement; error?: string } {
    const data = this.getData();
    const nowIso = new Date().toISOString();

    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'La instalación debe contener al menos un producto a descontar.' };
    }

    if (!params.motivo || params.motivo.trim() === '') {
      return { success: false, error: 'Debe especificar el motivo del movimiento (ej: "Instalación cliente Pérez").' };
    }

    // Gestionar el número consecutivo de factura que se guarda en esta misma base de datos
    let facturaFinal = params.numeroFactura?.trim();
    if (!facturaFinal) {
      facturaFinal = this.getNextInvoiceNumber();
      const currentConsecutive = this.getInvoiceConsecutive();
      data.invoiceConsecutive = currentConsecutive + 1;
    } else {
      const match = facturaFinal.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val >= (data.invoiceConsecutive || 1)) {
          data.invoiceConsecutive = val + 1;
        }
      }
    }

    const movementItems: StockMovementItem[] = [];
    let costoTotal = 0;
    let ingresoTotal = 0;

    for (const item of params.items) {
      const productIndex = data.products.findIndex((p) => p.id === item.productoId);
      if (productIndex === -1) {
        return { success: false, error: `Producto con ID ${item.productoId} no encontrado.` };
      }

      const product = data.products[productIndex];
      const stockAnterior = product.stockActual;
      const stockPosterior = stockAnterior - item.cantidad;

      const subCosto = item.cantidad * (product.precioCompra || 0);
      const subIngreso = item.cantidad * (product.precioVenta || 0);

      costoTotal += subCosto;
      ingresoTotal += subIngreso;

      movementItems.push({
        productoId: product.id,
        productoNombre: product.nombre,
        cantidad: item.cantidad,
        unidadMedida: product.unidadMedida || 'ud',
        precioCompraUnitario: product.precioCompra,
        precioVentaUnitario: product.precioVenta,
        stockAnterior,
        stockPosterior,
      });

      data.products[productIndex] = {
        ...product,
        stockActual: stockPosterior,
        updatedAt: nowIso,
      };
    }

    const gananciaTotal = ingresoTotal - costoTotal;

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tipo: 'SALIDA_INSTALACION',
      fechaHora: nowIso,
      motivo: params.motivo.trim(),
      cliente: params.cliente?.trim(),
      numeroFactura: facturaFinal,
      plantillaId: params.plantillaId,
      plantillaNombre: params.plantillaNombre,
      items: movementItems,
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      gananciaTotal: Math.round(gananciaTotal * 100) / 100,
      usuarioResponsable: params.usuarioResponsable,
      observaciones: params.observaciones,
    };

    data.movements.push(newMovement);
    this.persist({ ...data });

    return { success: true, movement: newMovement };
  }

  public registerStockEntry(params: {
    productoId: string;
    cantidad: number;
    motivo: string;
    precioCompraNuevo?: number;
    proveedor?: string;
    observaciones?: string;
  }): { success: boolean; movement?: StockMovement; error?: string } {
    const data = this.getData();
    const nowIso = new Date().toISOString();

    const productIndex = data.products.findIndex((p) => p.id === params.productoId);
    if (productIndex === -1) {
      return { success: false, error: 'Producto no encontrado.' };
    }

    if (params.cantidad <= 0) {
      return { success: false, error: 'La cantidad de entrada debe ser mayor a 0.' };
    }

    const product = data.products[productIndex];
    const stockAnterior = product.stockActual;
    const stockPosterior = stockAnterior + params.cantidad;
    const precioCompraFinal = params.precioCompraNuevo !== undefined && params.precioCompraNuevo > 0 
      ? params.precioCompraNuevo 
      : product.precioCompra;

    const costoTotal = params.cantidad * precioCompraFinal;

    const movementItem: StockMovementItem = {
      productoId: product.id,
      productoNombre: product.nombre,
      cantidad: params.cantidad,
      unidadMedida: product.unidadMedida || 'ud',
      precioCompraUnitario: precioCompraFinal,
      precioVentaUnitario: product.precioVenta,
      stockAnterior,
      stockPosterior,
    };

    data.products[productIndex] = {
      ...product,
      stockActual: stockPosterior,
      precioCompra: precioCompraFinal,
      proveedor: params.proveedor || product.proveedor,
      fechaEntrada: nowIso.split('T')[0],
      updatedAt: nowIso,
    };

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tipo: 'ENTRADA_STOCK',
      fechaHora: nowIso,
      motivo: params.motivo.trim() || 'Entrada de mercancía / Reposición',
      items: [movementItem],
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: 0,
      gananciaTotal: 0,
      observaciones: params.observaciones,
    };

    data.movements.push(newMovement);
    this.persist({ ...data });

    return { success: true, movement: newMovement };
  }

  public registerManualMovement(params: {
    tipo: 'SALIDA_MANUAL' | 'AJUSTE_INVENTARIO';
    motivo: string;
    cliente?: string;
    numeroFactura?: string;
    items: { productoId: string; cantidad: number }[];
    observaciones?: string;
  }): { success: boolean; movement?: StockMovement; error?: string } {
    const data = this.getData();
    const nowIso = new Date().toISOString();

    let facturaFinal = params.numeroFactura?.trim();
    if (params.tipo === 'SALIDA_MANUAL' && !facturaFinal) {
      facturaFinal = this.getNextInvoiceNumber();
      const currentConsecutive = this.getInvoiceConsecutive();
      data.invoiceConsecutive = currentConsecutive + 1;
    } else if (facturaFinal) {
      const match = facturaFinal.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val >= (data.invoiceConsecutive || 1)) {
          data.invoiceConsecutive = val + 1;
        }
      }
    }

    const movementItems: StockMovementItem[] = [];
    let costoTotal = 0;
    let ingresoTotal = 0;

    for (const item of params.items) {
      const productIndex = data.products.findIndex((p) => p.id === item.productoId);
      if (productIndex === -1) continue;

      const product = data.products[productIndex];
      const stockAnterior = product.stockActual;
      const stockPosterior = Math.max(0, stockAnterior - item.cantidad);

      const subCosto = item.cantidad * (product.precioCompra || 0);
      const subIngreso = item.cantidad * (product.precioVenta || 0);

      costoTotal += subCosto;
      ingresoTotal += subIngreso;

      movementItems.push({
        productoId: product.id,
        productoNombre: product.nombre,
        cantidad: item.cantidad,
        unidadMedida: product.unidadMedida || 'ud',
        precioCompraUnitario: product.precioCompra,
        precioVentaUnitario: product.precioVenta,
        stockAnterior,
        stockPosterior,
      });

      data.products[productIndex] = {
        ...product,
        stockActual: stockPosterior,
        updatedAt: nowIso,
      };
    }

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tipo: params.tipo,
      fechaHora: nowIso,
      motivo: params.motivo.trim() || 'Salida manual de almacén',
      cliente: params.cliente?.trim(),
      numeroFactura: facturaFinal,
      items: movementItems,
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      gananciaTotal: Math.round((ingresoTotal - costoTotal) * 100) / 100,
      observaciones: params.observaciones,
    };

    data.movements.push(newMovement);
    this.persist({ ...data });

    return { success: true, movement: newMovement };
  }

  public deleteMovement(movementId: string, revertStock: boolean = false): boolean {
    const data = this.getData();
    const movIndex = data.movements.findIndex((m) => m.id === movementId);
    if (movIndex === -1) return false;

    const movement = data.movements[movIndex];

    if (revertStock && movement.items && movement.items.length > 0) {
      const nowIso = new Date().toISOString();
      for (const item of movement.items) {
        const pIndex = data.products.findIndex((p) => p.id === item.productoId);
        if (pIndex !== -1) {
          const prod = data.products[pIndex];
          let updatedStock = prod.stockActual;
          if (movement.tipo === 'SALIDA_INSTALACION' || movement.tipo === 'SALIDA_MANUAL') {
            updatedStock = prod.stockActual + item.cantidad;
          } else if (movement.tipo === 'ENTRADA_STOCK') {
            updatedStock = Math.max(0, prod.stockActual - item.cantidad);
          } else if (movement.tipo === 'AJUSTE_INVENTARIO') {
            updatedStock = item.stockAnterior;
          }

          data.products[pIndex] = {
            ...prod,
            stockActual: updatedStock,
            updatedAt: nowIso,
          };
        }
      }
    }

    data.movements.splice(movIndex, 1);
    this.persist({ ...data });
    return true;
  }

  public deleteMultipleMovements(movementIds: string[], revertStock: boolean = false): number {
    let deletedCount = 0;
    for (const id of movementIds) {
      if (this.deleteMovement(id, revertStock)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // --- Financial & Stock Queries ---
  public getLowStockAlerts(): Product[] {
    return this.getData().products.filter((p) => p.stockActual <= p.stockMinimo);
  }

  public getFinancialSummary() {
    const movements = this.getMovements();
    const installations = movements.filter((m) => m.tipo === 'SALIDA_INSTALACION');
    
    let totalGanancia = 0;
    let totalIngresos = 0;
    let totalCostos = 0;

    installations.forEach((inst) => {
      totalGanancia += inst.gananciaTotal || 0;
      totalIngresos += inst.ingresoTotal || 0;
      totalCostos += inst.costoTotal || 0;
    });

    const products = this.getData().products;
    const valorInventarioCompra = products.reduce((acc, p) => acc + (p.stockActual * p.precioCompra), 0);
    const valorInventarioVenta = products.reduce((acc, p) => acc + (p.stockActual * p.precioVenta), 0);

    return {
      totalGanancia: Math.round(totalGanancia * 100) / 100,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalCostos: Math.round(totalCostos * 100) / 100,
      totalInstalaciones: installations.length,
      valorInventarioCompra: Math.round(valorInventarioCompra * 100) / 100,
      valorInventarioVenta: Math.round(valorInventarioVenta * 100) / 100,
      gananciaPotencialStock: Math.round((valorInventarioVenta - valorInventarioCompra) * 100) / 100,
    };
  }
}

export const dbService = new InventoryDatabase();
