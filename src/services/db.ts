import {
  InstallationTemplate,
  Product,
  StockMovement,
  StockMovementItem,
  ExtraService,
  CompanyInfo,
} from '../types';
import { verifyPermission } from '../utils/fileDatabase';
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
  empresa?: CompanyInfo;
  products: Product[];
  templates: InstallationTemplate[];
  movements: StockMovement[];
}

const DEFAULT_COMPANY: CompanyInfo = {
  nombre: 'Danos Electrical',
  telefono: '+53 58101968',
  cif: '',
  direccion: '',
  email: '',
};

class InventoryDatabase {
  private cache: DatabaseSchema = {
    version: 1,
    app: 'Gestión de Inventario y Stock',
    updatedAt: new Date().toISOString(),
    dbPath: 'inventario.json',
    invoiceConsecutive: 1,
    empresa: { ...DEFAULT_COMPANY },
    products: [],
    templates: [],
    movements: [],
  };

  private isDatabaseLoaded = false;
  private dbPath: string = 'inventario.json';
  private databaseFileName: string | null = null;
  private fileHandle: FileSystemFileHandle | null = null;
  private lastSavedAt: Date | null = null;
  private saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'pending_manual' = 'idle';
  private hasUnsavedChangesFlag = false;
  private listeners = new Set<() => void>();

  private productsSnapshot: Product[] = [];
  private templatesSnapshot: InstallationTemplate[] = [];
  private movementsSnapshot: StockMovement[] = [];
  private empresaSnapshot: CompanyInfo = { ...DEFAULT_COMPANY };
  private loadedSnapshot = false;
  private dbFileNameSnapshot: string | null = null;
  private saveStatusSnapshot: 'idle' | 'saving' | 'saved' | 'error' | 'pending_manual' = 'idle';
  private hasUnsavedSnapshot = false;
  private hasWritableSnapshot = false;

  private persistDebounceTimer: number | null = null;
  private persistDebounceMs = 150;

  private isSaving = false;
  private pendingSaveResolvers: Array<(value: any) => void> = [];
  private pendingSaveNeeded = false;

  constructor() {
    this.dbPath = getStoredDbPath() || 'inventario.json';
  }

  // ==========================================================================
  //  SUSCRIPCIÓN
  // ==========================================================================

  public subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  private notifyListeners(): void {
    this.productsSnapshot = [...this.cache.products];
    this.templatesSnapshot = [...this.cache.templates];
    this.movementsSnapshot = [...this.cache.movements].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );
    this.empresaSnapshot = this.cache.empresa ? { ...this.cache.empresa } : { ...DEFAULT_COMPANY };
    this.loadedSnapshot = this.isDatabaseLoaded;
    this.dbFileNameSnapshot = this.databaseFileName;
    this.saveStatusSnapshot = this.saveStatus;
    this.hasUnsavedSnapshot = this.hasUnsavedChangesFlag;
    this.hasWritableSnapshot = this.fileHandle !== null;

    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[db] Listener error', e);
      }
    });
  }

  public getProductsSnapshot = (): Product[] => this.productsSnapshot;
  public getTemplatesSnapshot = (): InstallationTemplate[] => this.templatesSnapshot;
  public getMovementsSnapshot = (): StockMovement[] => this.movementsSnapshot;
  public getEmpresaSnapshot = (): CompanyInfo => this.empresaSnapshot;
  public isLoadedSnapshot = (): boolean => this.loadedSnapshot;
  public getDatabaseFileNameSnapshot = (): string | null => this.dbFileNameSnapshot;
  public getSaveStatusSnapshot = (): typeof this.saveStatusSnapshot => this.saveStatusSnapshot;
  public hasUnsavedChangesSnapshot = (): boolean => this.hasUnsavedSnapshot;
  public hasWritableSnapshotFn = (): boolean => this.hasWritableSnapshot;

  // ==========================================================================
  //  GETTERS CLÁSICOS
  // ==========================================================================

  public isLoaded = (): boolean => this.isDatabaseLoaded;
  public getDatabaseFileName = (): string | null => this.databaseFileName;
  public getDbPath = (): string => this.dbPath || 'inventario.json';
  public getSaveStatus = () => this.saveStatus;
  public hasUnsavedChanges = (): boolean => this.hasUnsavedChangesFlag;
  public hasWritableHandle = (): boolean => this.fileHandle !== null;
  public getFileHandle = (): FileSystemFileHandle | null => this.fileHandle;
  public getLastSavedAt = (): Date | null => this.lastSavedAt;
  public getProducts = (): Product[] => [...this.cache.products];
  public getTemplates = (): InstallationTemplate[] => [...this.cache.templates];
  public getMovements = (): StockMovement[] =>
    [...this.cache.movements].sort(
      (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
    );

  public getEmpresa = (): CompanyInfo =>
    this.cache.empresa ? { ...this.cache.empresa } : { ...DEFAULT_COMPANY };

  public setEmpresa = (empresa: Partial<CompanyInfo>): void => {
    this.cache.empresa = {
      ...DEFAULT_COMPANY,
      ...this.cache.empresa,
      ...empresa,
    };
    this.persist({ ...this.cache });
  };

  public getProductById = (id: string): Product | undefined =>
    this.cache.products.find((p) => p.id === id);
  public getTemplateById = (id: string): InstallationTemplate | undefined =>
    this.cache.templates.find((t) => t.id === id);

  public getInvoiceConsecutive = (): number => {
    const n = this.cache.invoiceConsecutive;
    return typeof n === 'number' && n > 0 ? n : 1;
  };

  public getNextInvoiceNumber = (): string => {
    return `FAC-${String(this.getInvoiceConsecutive()).padStart(5, '0')}`;
  };

  public setInvoiceConsecutive = (num: number): void => {
    this.cache.invoiceConsecutive = Math.max(1, Math.floor(num));
    this.persistInternal();
  };

  // ==========================================================================
  //  INICIALIZACIÓN
  // ==========================================================================

  public async initFromStorage(): Promise<boolean> {
    try {
      const storedPath = getStoredDbPath();
      if (!storedPath) {
        this.isDatabaseLoaded = false;
        this.databaseFileName = null;
        this.saveStatus = 'idle';
        this.hasUnsavedChangesFlag = false;
        this.notifyListeners();
        return false;
      }

      this.dbPath = storedPath;
      this.databaseFileName = storedPath;

      const stored = await loadActiveDatabaseFromIndexedDb();
      if (!stored?.data || !Array.isArray(stored.data.products)) {
        this.isDatabaseLoaded = false;
        this.saveStatus = 'idle';
        this.notifyListeners();
        return false;
      }

      this.cache = stored.data;

      if (!this.cache.empresa) {
        this.cache.empresa = { ...DEFAULT_COMPANY };
      }

      if (typeof this.cache.invoiceConsecutive !== 'number' || this.cache.invoiceConsecutive < 1) {
        this.cache.invoiceConsecutive = this.computeNextInvoiceFromMovements(this.cache.movements);
      }

      this.cache.dbPath = stored.fileName || storedPath;
      this.databaseFileName = stored.fileName || storedPath;
      this.dbPath = this.databaseFileName || storedPath;
      setStoredDbPath(this.dbPath);

      this.isDatabaseLoaded = true;
      this.fileHandle = stored.handle || null;
      this.lastSavedAt = stored.updatedAt ? new Date(stored.updatedAt) : new Date();
      this.hasUnsavedChangesFlag = false;
      this.saveStatus = 'saved';

      if (this.fileHandle) {
        try {
          const perm = await this.fileHandle.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') {
            this.saveStatus = 'pending_manual';
            this.hasUnsavedChangesFlag = true;
          }
        } catch {
          this.saveStatus = 'pending_manual';
          this.hasUnsavedChangesFlag = true;
        }
      }

      this.notifyListeners();
      return true;
    } catch (e) {
      console.warn('[db] initFromStorage error', e);
      this.isDatabaseLoaded = false;
      this.saveStatus = 'idle';
      this.notifyListeners();
      return false;
    }
  }

  private computeNextInvoiceFromMovements(movements: StockMovement[]): number {
    const max = movements.reduce((acc, m) => {
      if (!m.numeroFactura) return acc;
      const match = m.numeroFactura.match(/\d+/);
      if (!match) return acc;
      const v = parseInt(match[0], 10);
      return v > acc ? v : acc;
    }, 0);
    return max > 0 ? max + 1 : 1;
  }

  // ==========================================================================
  //  CARGA / CREACIÓN
  // ==========================================================================

  public async loadFromFile(
    file: File,
    handle?: FileSystemFileHandle | null
  ): Promise<{
    success: boolean;
    message?: string;
    stats?: { products: number; movements: number; templates: number };
  }> {
    try {
      const text = await file.text();

      if (text.trim().length === 0) {
        return this.applyNewDatabase(file.name, [], [], [], 1, handle);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          success: false,
          message:
            'No se pudo leer el archivo. Asegúrate de que es un .json válido con estructura de base de datos.',
        };
      }

      let products: Product[] = [];
      let templates: InstallationTemplate[] = [];
      let movements: StockMovement[] = [];
      let version = 1;
      let invoiceConsecutive = 1;
      let empresa: CompanyInfo = { ...DEFAULT_COMPANY };

      if (Array.isArray(parsed.products)) {
        products = parsed.products.map((p: any) => this.normalizeProduct(p));
        templates = Array.isArray(parsed.templates)
          ? parsed.templates.map((t: any) => this.normalizeTemplate(t))
          : [];
        movements = Array.isArray(parsed.movements)
          ? parsed.movements.map((m: any) => this.normalizeMovement(m))
          : [];
        version = parsed.version || 1;
        invoiceConsecutive =
          typeof parsed.invoiceConsecutive === 'number' && parsed.invoiceConsecutive > 0
            ? parsed.invoiceConsecutive
            : this.computeNextInvoiceFromMovements(movements);
        if (parsed.empresa && typeof parsed.empresa === 'object') {
          empresa = { ...DEFAULT_COMPANY, ...parsed.empresa };
        }
      } else if (Array.isArray(parsed)) {
        products = parsed.map((p: any) => this.normalizeProduct(p));
      } else {
        return {
          success: false,
          message: 'El archivo no tiene una estructura de base de datos válida.',
        };
      }

      const result = await this.applyNewDatabase(
        file.name,
        products,
        templates,
        movements,
        invoiceConsecutive,
        handle,
        version,
        empresa
      );

      return {
        ...result,
        stats: {
          products: products.length,
          movements: movements.length,
          templates: templates.length,
        },
      };
    } catch (err: any) {
      console.error('[db] loadFromFile error', err);
      return {
        success: false,
        message: err.message || 'Error al acceder al archivo.',
      };
    }
  }

  private async applyNewDatabase(
    fileName: string,
    products: Product[],
    templates: InstallationTemplate[],
    movements: StockMovement[],
    invoiceConsecutive: number,
    handle?: FileSystemFileHandle | null,
    version: number = 1,
    empresa?: CompanyInfo
  ): Promise<{ success: boolean; message?: string }> {
    this.dbPath = fileName;
    this.databaseFileName = fileName;
    setStoredDbPath(fileName);

    this.cache = {
      version,
      app: 'Gestión de Inventario y Stock',
      updatedAt: new Date().toISOString(),
      dbPath: fileName,
      invoiceConsecutive,
      empresa: empresa || { ...DEFAULT_COMPANY },
      products,
      templates,
      movements,
    };

    this.isDatabaseLoaded = true;
    this.fileHandle = handle || null;
    this.lastSavedAt = new Date();
    this.hasUnsavedChangesFlag = false;
    this.saveStatus = handle ? 'saved' : 'pending_manual';

    await saveActiveDatabaseToIndexedDb(fileName, this.cache, this.fileHandle);

    if (handle) {
      const ok = await verifyPermission(handle, true);
      if (ok) {
        await this.writeToFile();
      }
    }

    this.notifyListeners();
    return { success: true };
  }

  public async createNewDatabase(
    fileName: string,
    _withSampleData: boolean = false,
    handle?: FileSystemFileHandle | null
  ): Promise<void> {
    const clean = fileName.trim().endsWith('.json')
      ? fileName.trim()
      : `${fileName.trim()}.json`;

    await this.applyNewDatabase(clean, [], [], [], 1, handle, 1, { ...DEFAULT_COMPANY });
  }

  // ==========================================================================
  //  GUARDADO
  // ==========================================================================

  private persistInternal(): Promise<void> {
    this.cache.updatedAt = new Date().toISOString();

    if (this.persistDebounceTimer !== null) {
      window.clearTimeout(this.persistDebounceTimer);
    }

    return new Promise((resolve) => {
      this.persistDebounceTimer = window.setTimeout(async () => {
        this.persistDebounceTimer = null;
        try {
          await saveActiveDatabaseToIndexedDb(this.getDbPath(), this.cache, this.fileHandle);
        } catch (e) {
          console.warn('[db] persistInternal warning', e);
        }
        resolve();
      }, this.persistDebounceMs);
    });
  }

  private async persistInternalImmediate(): Promise<void> {
    if (this.persistDebounceTimer !== null) {
      window.clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }
    this.cache.updatedAt = new Date().toISOString();
    try {
      await saveActiveDatabaseToIndexedDb(this.getDbPath(), this.cache, this.fileHandle);
    } catch (e) {
      console.warn('[db] persistInternalImmediate warning', e);
    }
  }

  private async writeToFile(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.fileHandle) {
      return { ok: false, reason: 'No hay archivo vinculado.' };
    }

    try {
      const perm = await verifyPermission(this.fileHandle, true);
      if (!perm) {
        return { ok: false, reason: 'Permiso denegado por el navegador.' };
      }

      const writable = await this.fileHandle.createWritable({ keepExistingData: false });
      await writable.write(JSON.stringify(this.cache, null, 2));
      await writable.close();
      return { ok: true };
    } catch (e: any) {
      console.warn('[db] writeToFile error', e);
      return { ok: false, reason: e?.message || 'Error de escritura.' };
    }
  }

  private async doActualSave(): Promise<{
    success: boolean;
    fileName: string;
    method: 'direct' | 'internal' | 'error';
    message: string;
  }> {
    this.cache.updatedAt = new Date().toISOString();

    await this.persistInternalImmediate();

    if (this.fileHandle) {
      const result = await this.writeToFile();
      if (result.ok) {
        this.lastSavedAt = new Date();
        this.hasUnsavedChangesFlag = false;
        this.saveStatus = 'saved';
        await this.persistInternalImmediate();
        this.notifyListeners();
        return {
          success: true,
          fileName: this.getDbPath(),
          method: 'direct',
          message: `✅ Archivo "${this.getDbPath()}" actualizado correctamente.`,
        };
      }
      this.lastSavedAt = new Date();
      this.saveStatus = 'pending_manual';
      this.hasUnsavedChangesFlag = true;
      this.notifyListeners();
      return {
        success: false,
        fileName: this.getDbPath(),
        method: 'error',
        message: `⚠️ No se pudo escribir en "${this.getDbPath()}": ${result.reason}.`,
      };
    }

    this.lastSavedAt = new Date();
    this.hasUnsavedChangesFlag = false;
    this.saveStatus = 'saved';
    this.notifyListeners();

    return {
      success: true,
      fileName: this.getDbPath(),
      method: 'internal',
      message: `💾 Cambios guardados en la app. Vincula un archivo o usa "Descargar copia" para el .json.`,
    };
  }

  public async saveCurrentDatabase(): Promise<{
    success: boolean;
    fileName: string;
    method: 'direct' | 'internal' | 'error';
    message: string;
  }> {
    if (!this.isDatabaseLoaded) {
      return {
        success: false,
        fileName: this.getDbPath(),
        method: 'error',
        message: 'No hay base de datos cargada.',
      };
    }

    if (this.isSaving) {
      this.pendingSaveNeeded = true;
      return new Promise((resolve) => {
        this.pendingSaveResolvers.push(resolve);
      });
    }

    return this.runSave();
  }

  private async runSave(): Promise<{
    success: boolean;
    fileName: string;
    method: 'direct' | 'internal' | 'error';
    message: string;
  }> {
    this.isSaving = true;
    this.saveStatus = 'saving';
    this.notifyListeners();

    try {
      const result = await this.doActualSave();
      return result;
    } finally {
      this.isSaving = false;

      if (this.pendingSaveNeeded) {
        this.pendingSaveNeeded = false;
        setTimeout(async () => {
          const finalResult = await this.runSave();
          const resolvers = this.pendingSaveResolvers.splice(0);
          resolvers.forEach((r) => r(finalResult));
        }, 50);
      } else {
        const resolvers = this.pendingSaveResolvers.splice(0);
        resolvers.forEach((r) => r(undefined as any));
      }
    }
  }

  private persist(data: DatabaseSchema): void {
    this.cache = { ...data, updatedAt: new Date().toISOString() };
    if (!this.isDatabaseLoaded) this.isDatabaseLoaded = true;
    if (!this.databaseFileName) this.databaseFileName = this.getDbPath();

    this.persistInternal().then(() => {
      this.hasUnsavedChangesFlag = true;
      this.saveStatus = 'pending_manual';
      this.notifyListeners();
    });
  }

  public setFileHandle(handle: FileSystemFileHandle | null): void {
    this.fileHandle = handle;
    this.notifyListeners();
  }

  public disconnectDatabase(clearStorage: boolean = false): void {
    if (clearStorage) {
      clearActiveDatabaseInIndexedDb();
      this.cache = {
        version: 1,
        app: 'Gestión de Inventario y Stock',
        updatedAt: new Date().toISOString(),
        empresa: { ...DEFAULT_COMPANY },
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

  public exportDatabaseAsBlob(): { blob: Blob; fileName: string } {
    const jsonStr = JSON.stringify(this.cache, null, 2);
    return {
      blob: new Blob([jsonStr], { type: 'application/json' }),
      fileName: this.databaseFileName || 'inventario.json',
    };
  }

  // ==========================================================================
  //  NORMALIZACIÓN
  // ==========================================================================

  private normalizeProduct(p: any): Product {
    const now = new Date().toISOString();
    return {
      id: String(p.id ?? `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      nombre: String(p.nombre ?? 'Sin nombre'),
      categoria: String(p.categoria ?? 'General'),
      stockActual: Number(p.stockActual) || 0,
      stockMinimo: Number(p.stockMinimo) || 0,
      precioCompra: Number(p.precioCompra) || 0,
      precioVenta: Number(p.precioVenta) || 0,
      proveedor: String(p.proveedor ?? ''),
      fechaEntrada: String(p.fechaEntrada ?? now.split('T')[0]),
      unidadMedida: String(p.unidadMedida ?? 'ud'),
      ubicacion: p.ubicacion ? String(p.ubicacion) : undefined,
      notas: p.notas ? String(p.notas) : undefined,
      createdAt: String(p.createdAt ?? now),
      updatedAt: String(p.updatedAt ?? now),
    };
  }

  private normalizeTemplate(t: any): InstallationTemplate {
    const now = new Date().toISOString();
    return {
      id: String(t.id ?? `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      nombre: String(t.nombre ?? 'Sin nombre'),
      descripcion: String(t.descripcion ?? ''),
      categoria: t.categoria ? String(t.categoria) : undefined,
      items: Array.isArray(t.items)
        ? t.items.map((i: any) => ({
            productoId: String(i.productoId),
            cantidad: Number(i.cantidad) || 0,
            notasItem: i.notasItem ? String(i.notasItem) : undefined,
          }))
        : [],
      precioVentaPersonalizado:
        typeof t.precioVentaPersonalizado === 'number' ? t.precioVentaPersonalizado : null,
      tiempoEstimadoHoras:
        typeof t.tiempoEstimadoHoras === 'number' ? t.tiempoEstimadoHoras : undefined,
      createdAt: String(t.createdAt ?? now),
      updatedAt: String(t.updatedAt ?? now),
    };
  }

  private normalizeExtraService(s: any): ExtraService {
    return {
      id: String(s.id ?? `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      nombre: String(s.nombre ?? 'Servicio'),
      cantidad: Number(s.cantidad) || 1,
      precioVenta: Number(s.precioVenta) || 0,
      coste: Number(s.coste) || 0,
      notas: s.notas ? String(s.notas) : undefined,
    };
  }

  private normalizeMovement(m: any): StockMovement {
    const serviciosExtra = Array.isArray(m.serviciosExtra)
      ? m.serviciosExtra.map((s: any) => this.normalizeExtraService(s))
      : undefined;

    return {
      ...m,
      serviciosExtra,
      descuento: typeof m.descuento === 'number' ? m.descuento : 0,
    } as StockMovement;
  }

  // ==========================================================================
  //  PRODUCTS CRUD
  // ==========================================================================

  public saveProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Product {
    const now = new Date().toISOString();

    if (productData.id) {
      const idx = this.cache.products.findIndex((p) => p.id === productData.id);
      if (idx !== -1) {
        const updated: Product = {
          ...this.cache.products[idx],
          ...productData,
          id: productData.id,
          updatedAt: now,
        };
        this.cache.products[idx] = updated;
        this.persist({ ...this.cache });
        return updated;
      }
    }

    const newProduct: Product = {
      ...productData,
      id: productData.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.cache.products.push(newProduct);
    this.persist({ ...this.cache });
    return newProduct;
  }

  public deleteProduct(id: string): boolean {
    const before = this.cache.products.length;
    this.cache.products = this.cache.products.filter((p) => p.id !== id);
    if (this.cache.products.length !== before) {
      this.persist({ ...this.cache });
      return true;
    }
    return false;
  }

  // ==========================================================================
  //  TEMPLATES CRUD
  // ==========================================================================

  public saveTemplate(
    templateData: Omit<InstallationTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): InstallationTemplate {
    const now = new Date().toISOString();

    if (templateData.id) {
      const idx = this.cache.templates.findIndex((t) => t.id === templateData.id);
      if (idx !== -1) {
        const updated: InstallationTemplate = {
          ...this.cache.templates[idx],
          ...templateData,
          id: templateData.id,
          updatedAt: now,
        };
        this.cache.templates[idx] = updated;
        this.persist({ ...this.cache });
        return updated;
      }
    }

    const newTemplate: InstallationTemplate = {
      ...templateData,
      id: templateData.id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.cache.templates.push(newTemplate);
    this.persist({ ...this.cache });
    return newTemplate;
  }

  public deleteTemplate(id: string): boolean {
    const before = this.cache.templates.length;
    this.cache.templates = this.cache.templates.filter((t) => t.id !== id);
    if (this.cache.templates.length !== before) {
      this.persist({ ...this.cache });
      return true;
    }
    return false;
  }

  // ==========================================================================
  //  MOVIMIENTOS
  // ==========================================================================

  public executeInstallation(params: {
    plantillaId?: string;
    plantillaNombre?: string;
    motivo: string;
    cliente?: string;
    clienteCI?: string;
    clienteDireccion?: string;
    numeroFactura?: string;
    formaPago?: string;
    items: { productoId: string; cantidad: number }[];
    serviciosExtra?: Omit<ExtraService, 'id'>[];
    descuento?: number;
    observaciones?: string;
    usuarioResponsable?: string;
  }): { success: boolean; movement?: StockMovement; error?: string } {
    const nowIso = new Date().toISOString();

    if (!params.items?.length && !params.serviciosExtra?.length) {
      return {
        success: false,
        error: 'La instalación debe contener al menos un producto o un servicio.',
      };
    }
    if (!params.motivo?.trim()) {
      return { success: false, error: 'Debe especificar el motivo del movimiento.' };
    }

    let facturaFinal = params.numeroFactura?.trim();
    if (!facturaFinal) {
      facturaFinal = this.getNextInvoiceNumber();
      this.cache.invoiceConsecutive = this.getInvoiceConsecutive() + 1;
    } else {
      const match = facturaFinal.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val >= this.getInvoiceConsecutive()) {
          this.cache.invoiceConsecutive = val + 1;
        }
      }
    }

    const movementItems: StockMovementItem[] = [];
    let costoProductos = 0;
    let ingresoProductos = 0;

    for (const item of params.items || []) {
      const idx = this.cache.products.findIndex((p) => p.id === item.productoId);
      if (idx === -1) {
        return { success: false, error: `Producto ${item.productoId} no encontrado.` };
      }
      const prod = this.cache.products[idx];
      const stockAnterior = prod.stockActual;
      const stockPosterior = stockAnterior - item.cantidad;

      costoProductos += item.cantidad * (prod.precioCompra || 0);
      ingresoProductos += item.cantidad * (prod.precioVenta || 0);

      movementItems.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        cantidad: item.cantidad,
        unidadMedida: prod.unidadMedida || 'ud',
        precioCompraUnitario: prod.precioCompra,
        precioVentaUnitario: prod.precioVenta,
        stockAnterior,
        stockPosterior,
      });

      this.cache.products[idx] = { ...prod, stockActual: stockPosterior, updatedAt: nowIso };
    }

    const serviciosExtra: ExtraService[] = (params.serviciosExtra || [])
      .filter((s) => (s.nombre || '').trim().length > 0)
      .map((s) => ({
        id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: s.nombre.trim(),
        cantidad: Number(s.cantidad) || 1,
        precioVenta: Number(s.precioVenta) || 0,
        coste: Number(s.coste) || 0,
        notas: s.notas,
      }));

    let ingresoServicios = 0;
    let costeServicios = 0;
    serviciosExtra.forEach((s) => {
      ingresoServicios += s.cantidad * s.precioVenta;
      costeServicios += s.cantidad * s.coste;
    });

    const descuento = Math.max(0, Number(params.descuento) || 0);

    const gananciaProductos = ingresoProductos - costoProductos;
    const gananciaServicios = ingresoServicios - costeServicios;
    const gananciaTotal = gananciaProductos + gananciaServicios;

    const costoTotal = costoProductos;
    const ingresoTotal = ingresoProductos;

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipo: 'SALIDA_INSTALACION',
      fechaHora: nowIso,
      motivo: params.motivo.trim(),
      cliente: params.cliente?.trim(),
      clienteCI: params.clienteCI?.trim(),
      clienteDireccion: params.clienteDireccion?.trim(),
      numeroFactura: facturaFinal,
      formaPago: params.formaPago?.trim() || 'USD en efectivo',
      plantillaId: params.plantillaId,
      plantillaNombre: params.plantillaNombre,
      items: movementItems,
      serviciosExtra: serviciosExtra.length > 0 ? serviciosExtra : undefined,
      descuento: descuento > 0 ? descuento : undefined,
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      gananciaTotal: Math.round(gananciaTotal * 100) / 100,
      usuarioResponsable: params.usuarioResponsable,
      observaciones: params.observaciones,
    };

    this.cache.movements.push(newMovement);
    this.persist({ ...this.cache });
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
    const nowIso = new Date().toISOString();
    const idx = this.cache.products.findIndex((p) => p.id === params.productoId);
    if (idx === -1) return { success: false, error: 'Producto no encontrado.' };
    if (params.cantidad <= 0) return { success: false, error: 'La cantidad debe ser > 0.' };

    const prod = this.cache.products[idx];
    const stockAnterior = prod.stockActual;
    const stockPosterior = stockAnterior + params.cantidad;
    const precioCompraFinal =
      params.precioCompraNuevo && params.precioCompraNuevo > 0
        ? params.precioCompraNuevo
        : prod.precioCompra;

    const costoTotal = params.cantidad * precioCompraFinal;

    this.cache.products[idx] = {
      ...prod,
      stockActual: stockPosterior,
      precioCompra: precioCompraFinal,
      proveedor: params.proveedor || prod.proveedor,
      fechaEntrada: nowIso.split('T')[0],
      updatedAt: nowIso,
    };

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipo: 'ENTRADA_STOCK',
      fechaHora: nowIso,
      motivo: params.motivo.trim() || 'Entrada de mercancía',
      items: [
        {
          productoId: prod.id,
          productoNombre: prod.nombre,
          cantidad: params.cantidad,
          unidadMedida: prod.unidadMedida || 'ud',
          precioCompraUnitario: precioCompraFinal,
          precioVentaUnitario: prod.precioVenta,
          stockAnterior,
          stockPosterior,
        },
      ],
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: 0,
      gananciaTotal: 0,
      observaciones: params.observaciones,
    };

    this.cache.movements.push(newMovement);
    this.persist({ ...this.cache });
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
    const nowIso = new Date().toISOString();

    let facturaFinal = params.numeroFactura?.trim();
    if (params.tipo === 'SALIDA_MANUAL' && !facturaFinal) {
      facturaFinal = this.getNextInvoiceNumber();
      this.cache.invoiceConsecutive = this.getInvoiceConsecutive() + 1;
    }

    const movementItems: StockMovementItem[] = [];
    let costoTotal = 0;
    let ingresoTotal = 0;

    for (const item of params.items) {
      const idx = this.cache.products.findIndex((p) => p.id === item.productoId);
      if (idx === -1) continue;
      const prod = this.cache.products[idx];
      const stockAnterior = prod.stockActual;
      const stockPosterior = Math.max(0, stockAnterior - item.cantidad);

      costoTotal += item.cantidad * (prod.precioCompra || 0);
      ingresoTotal += item.cantidad * (prod.precioVenta || 0);

      movementItems.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        cantidad: item.cantidad,
        unidadMedida: prod.unidadMedida || 'ud',
        precioCompraUnitario: prod.precioCompra,
        precioVentaUnitario: prod.precioVenta,
        stockAnterior,
        stockPosterior,
      });

      this.cache.products[idx] = { ...prod, stockActual: stockPosterior, updatedAt: nowIso };
    }

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipo: params.tipo,
      fechaHora: nowIso,
      motivo: params.motivo.trim() || 'Salida manual',
      cliente: params.cliente?.trim(),
      numeroFactura: facturaFinal,
      items: movementItems,
      costoTotal: Math.round(costoTotal * 100) / 100,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      gananciaTotal: Math.round((ingresoTotal - costoTotal) * 100) / 100,
      observaciones: params.observaciones,
    };

    this.cache.movements.push(newMovement);
    this.persist({ ...this.cache });
    return { success: true, movement: newMovement };
  }

  public deleteMovement(movementId: string, revertStock: boolean = false): boolean {
    const idx = this.cache.movements.findIndex((m) => m.id === movementId);
    if (idx === -1) return false;

    const movement = this.cache.movements[idx];
    const nowIso = new Date().toISOString();

    if (revertStock && movement.items?.length) {
      for (const item of movement.items) {
        const pIdx = this.cache.products.findIndex((p) => p.id === item.productoId);
        if (pIdx === -1) continue;
        const prod = this.cache.products[pIdx];
        let updatedStock = prod.stockActual;

        if (movement.tipo === 'SALIDA_INSTALACION' || movement.tipo === 'SALIDA_MANUAL') {
          updatedStock = prod.stockActual + item.cantidad;
        } else if (movement.tipo === 'ENTRADA_STOCK') {
          updatedStock = Math.max(0, prod.stockActual - item.cantidad);
        } else if (movement.tipo === 'AJUSTE_INVENTARIO') {
          updatedStock = item.stockAnterior;
        }

        this.cache.products[pIdx] = { ...prod, stockActual: updatedStock, updatedAt: nowIso };
      }
    }

    this.cache.movements.splice(idx, 1);
    this.persist({ ...this.cache });
    return true;
  }

  public deleteMultipleMovements(movementIds: string[], revertStock: boolean = false): number {
    let count = 0;
    for (const id of movementIds) {
      if (this.deleteMovement(id, revertStock)) count++;
    }
    return count;
  }

  // ==========================================================================
  //  CONSULTAS FINANCIERAS
  // ==========================================================================

  public getLowStockAlerts(): Product[] {
    return this.cache.products.filter((p) => p.stockActual <= p.stockMinimo);
  }

  public getFinancialSummary() {
    const installations = this.cache.movements.filter((m) => m.tipo === 'SALIDA_INSTALACION');
    let totalGanancia = 0;
    let totalIngresos = 0;
    let totalCostos = 0;
    installations.forEach((i) => {
      totalGanancia += i.gananciaTotal || 0;
      totalIngresos += i.ingresoTotal || 0;
      totalCostos += i.costoTotal || 0;
    });

    const valorCompra = this.cache.products.reduce((a, p) => a + p.stockActual * p.precioCompra, 0);
    const valorVenta = this.cache.products.reduce((a, p) => a + p.stockActual * p.precioVenta, 0);

    return {
      totalGanancia: Math.round(totalGanancia * 100) / 100,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalCostos: Math.round(totalCostos * 100) / 100,
      totalInstalaciones: installations.length,
      valorInventarioCompra: Math.round(valorCompra * 100) / 100,
      valorInventarioVenta: Math.round(valorVenta * 100) / 100,
      gananciaPotencialStock: Math.round((valorVenta - valorCompra) * 100) / 100,
    };
  }
}

export const dbService = new InventoryDatabase();