/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Navbar } from './components/Navbar';
import { StockAlertsBanner } from './components/StockAlertsBanner';
import { DatabasePromptBanner } from './components/DatabasePromptBanner';
import { DatabaseModal } from './components/DatabaseModal';
import { UnsavedChangesPromptModal } from './components/UnsavedChangesPromptModal';
import { ProductsView } from './components/ProductsView';
import { TemplatesView } from './components/TemplatesView';
import { MovementsView } from './components/MovementsView';
import { ProfitDashboardView } from './components/ProfitDashboardView';
import { StockAlertsView } from './components/StockAlertsView';
import { ProductFormModal } from './components/ProductFormModal';
import { TemplateFormModal } from './components/TemplateFormModal';
import { StockAdjustmentModal } from './components/StockAdjustmentModal';
import { ExecuteInstallationModal } from './components/ExecuteInstallationModal';

import { ActiveTab, InstallationTemplate, Product } from './types';
import { dbService } from './services/db';
import { pickDatabaseFile } from './utils/fileDatabase';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');

  // Suscripción eficiente a la base de datos
  const subscribe = useMemo(() => dbService.subscribe, []);

  const isDbLoaded = useSyncExternalStore(subscribe, dbService.isLoadedSnapshot, () => false);
  const dbFileName = useSyncExternalStore(subscribe, dbService.getDatabaseFileNameSnapshot, () => null);
  const saveStatus = useSyncExternalStore(subscribe, dbService.getSaveStatusSnapshot, () => 'idle' as const);
  const hasUnsavedChanges = useSyncExternalStore(subscribe, dbService.hasUnsavedChangesSnapshot, () => false);
  const products = useSyncExternalStore(subscribe, dbService.getProductsSnapshot, () => []);
  const templates = useSyncExternalStore(subscribe, dbService.getTemplatesSnapshot, () => []);
  const movements = useSyncExternalStore(subscribe, dbService.getMovementsSnapshot, () => []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.categoria))).filter(Boolean),
    [products]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isUnsavedPromptOpen, setIsUnsavedPromptOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InstallationTemplate | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [selectedTemplateIdForExecution, setSelectedTemplateIdForExecution] = useState<string | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToastMessage({ text, type });
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 4500);
  };

  // Inicialización (NO carga datos demo si no hay nada)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await dbService.initFromStorage();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Aviso al cerrar la pestaña si hay cambios sin guardar en el archivo
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dbService.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // NUEVO: Auto-guardado al minimizar o cambiar de pestaña.
  // Así, si el usuario minimiza el navegador con cambios pendientes,
  // intentamos persistir en el archivo real sin que tenga que pulsar Guardar.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && dbService.hasUnsavedChanges()) {
        try {
          const res = await dbService.saveCurrentDatabase();
          // Silencioso: no mostramos toast porque el usuario no está mirando
          if (res.success && res.method === 'direct') {
            console.info('[App] Auto-guardado al ocultar pestaña: OK');
          }
        } catch (e) {
          console.warn('[App] Auto-guardado al ocultar pestaña falló:', e);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ==========================================================================
  //  OPERACIONES DE BASE DE DATOS
  // ==========================================================================

  const handleSelectDatabaseFile = async () => {
    try {
      const result = await pickDatabaseFile(fileInputRef.current);
      if (!result) return;
      const loadResult = await dbService.loadFromFile(result.file, result.handle);
      if (loadResult.success) {
        showToast(
          `Base de datos "${result.file.name}" cargada (${loadResult.stats?.products || 0} productos, ${loadResult.stats?.movements || 0} movimientos)`,
          'success'
        );
      } else {
        showToast(loadResult.message || 'Error al leer el archivo', 'warning');
      }
    } catch (err) {
      console.error('Error al seleccionar base de datos', err);
      showToast('No se pudo acceder al archivo seleccionado', 'warning');
    }
  };

  const handleFallbackFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const loadResult = await dbService.loadFromFile(file, null);
    if (loadResult.success) {
      showToast(`Base de datos "${file.name}" cargada (${loadResult.stats?.products || 0} productos)`, 'success');
    } else {
      showToast(loadResult.message || 'Error al leer el archivo', 'warning');
    }
    e.target.value = '';
  };

  const handleSaveCurrentDatabase = async () => {
    try {
      const res = await dbService.saveCurrentDatabase();
      if (res.success && res.method === 'direct') {
        showToast(res.message, 'success');
      } else if (res.success && res.method === 'internal') {
        showToast(res.message, 'info');
      } else {
        showToast(res.message, 'warning');
      }
    } catch (err) {
      console.error('Error al guardar base de datos', err);
      showToast('Error al guardar datos en el archivo', 'warning');
    }
  };

  const handleRequestCloseApp = () => {
    if (dbService.hasUnsavedChanges()) {
      setIsUnsavedPromptOpen(true);
    } else {
      showToast('Todos los cambios están guardados.', 'success');
    }
  };

  // ==========================================================================
  //  PRODUCTS
  // ==========================================================================

  const handleSaveProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    dbService.saveProduct(productData);
    showToast(productData.id ? 'Producto actualizado' : 'Producto añadido al inventario', 'success');
  };

  const handleDeleteProduct = (productId: string) => {
    if (dbService.deleteProduct(productId)) {
      showToast('Producto eliminado del catálogo', 'info');
    }
  };

  // ==========================================================================
  //  TEMPLATES
  // ==========================================================================

  const handleSaveTemplate = (
    templateData: Omit<InstallationTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    dbService.saveTemplate(templateData);
    showToast(templateData.id ? 'Plantilla actualizada' : 'Nueva plantilla creada', 'success');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (dbService.deleteTemplate(templateId)) {
      showToast('Plantilla eliminada', 'info');
    }
  };

  // ==========================================================================
  //  INSTALACIONES
  // ==========================================================================

  const handleConfirmInstallation = (params: {
    plantillaId?: string;
    plantillaNombre?: string;
    motivo: string;
    cliente?: string;
    clienteCI?: string;
    clienteDireccion?: string;
    numeroFactura?: string;
    formaPago?: string;
    items: { productoId: string; cantidad: number }[];
    serviciosExtra?: any[];
    descuento?: number;
    observaciones?: string;
  }) => {
    const result = dbService.executeInstallation(params);
    if (result.success && result.movement) {
      const tag = result.movement.numeroFactura ? ` [${result.movement.numeroFactura}]` : '';
      showToast(
        `Instalación registrada${tag}. Stock descontado (+${result.movement.gananciaTotal.toFixed(2)} USD)`,
        'success'
      );
    } else {
      showToast(result.error || 'Error al ejecutar la instalación', 'warning');
    }
  };

  // ==========================================================================
  //  STOCK
  // ==========================================================================

  const handleConfirmStockEntry = (params: {
    productoId: string;
    cantidad: number;
    motivo: string;
    precioCompraNuevo?: number;
    proveedor?: string;
    observaciones?: string;
  }) => {
    const result = dbService.registerStockEntry(params);
    if (result.success) {
      showToast('Entrada de stock registrada', 'success');
    } else {
      showToast(result.error || 'Error al registrar entrada', 'warning');
    }
  };

  // ==========================================================================
  //  MOVIMIENTOS
  // ==========================================================================

  const handleDeleteMovement = (movementId: string, revertStock: boolean) => {
    if (dbService.deleteMovement(movementId, revertStock)) {
      showToast(
        revertStock
          ? 'Registro eliminado y stock restaurado'
          : 'Registro eliminado del historial',
        'info'
      );
    } else {
      showToast('No se encontró el registro', 'warning');
    }
  };

  const handleDeleteMultipleMovements = (movementIds: string[], revertStock: boolean) => {
    const count = dbService.deleteMultipleMovements(movementIds, revertStock);
    if (count > 0) {
      showToast(
        `Se eliminaron ${count} registro(s)${revertStock ? ' (stock restaurado)' : ''}`,
        'info'
      );
    }
  };

  // ==========================================================================
  //  ABRIR MODALES
  // ==========================================================================

  const openNewProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const openQuickReplenish = (prod: Product) => {
    setSelectedProductForStock(prod);
    setIsStockModalOpen(true);
  };

  const openExecuteInstallation = (template?: InstallationTemplate) => {
    if (templates.length === 0) {
      showToast('Primero debes crear al menos una plantilla de instalación.', 'warning');
      setIsTemplateModalOpen(true);
      return;
    }
    setSelectedTemplateIdForExecution(template?.id || templates[0].id);
    setIsExecuteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 pb-12 sm:pb-8">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.db,.sqlite"
        className="hidden"
        onChange={handleFallbackFileInputChange}
      />

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 shadow-xl">
          <div
            className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900 text-amber-100 border-amber-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toastMessage.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        products={products}
        onNewProduct={openNewProduct}
        onExecuteInstallation={() => openExecuteInstallation()}
        onNewStockEntry={() => {
          setSelectedProductForStock(null);
          setIsStockModalOpen(true);
        }}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onSelectDatabaseFile={handleSelectDatabaseFile}
        onSaveCurrentDatabase={handleSaveCurrentDatabase}
        onRequestCloseApp={handleRequestCloseApp}
      />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex-1">
        {!isDbLoaded && (
          <DatabasePromptBanner
            onSelectExisting={handleSelectDatabaseFile}
            onOpenModal={() => setIsDatabaseModalOpen(true)}
            onCreateSample={() => setIsDatabaseModalOpen(true)}
          />
        )}

        {isDbLoaded && activeTab !== 'alerts' && (
          <StockAlertsBanner
            products={products}
            onViewAlerts={() => setActiveTab('alerts')}
            onQuickReplenish={openQuickReplenish}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            categories={categories}
            onNewProduct={openNewProduct}
            onEditProduct={openEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onQuickReplenish={openQuickReplenish}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView
            templates={templates}
            products={products}
            onCreateTemplate={() => {
              setEditingTemplate(null);
              setIsTemplateModalOpen(true);
            }}
            onEditTemplate={(tpl) => {
              setEditingTemplate(tpl);
              setIsTemplateModalOpen(true);
            }}
            onDeleteTemplate={handleDeleteTemplate}
            onExecuteTemplate={(tpl) => openExecuteInstallation(tpl)}
          />
        )}

        {activeTab === 'movements' && (
          <MovementsView
            movements={movements}
            onNewStockEntry={() => {
              setSelectedProductForStock(null);
              setIsStockModalOpen(true);
            }}
            onExecuteInstallation={() => openExecuteInstallation()}
            onDeleteMovement={handleDeleteMovement}
            onDeleteMultipleMovements={handleDeleteMultipleMovements}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'profit' && <ProfitDashboardView movements={movements} />}

        {activeTab === 'alerts' && (
          <StockAlertsView
            products={products}
            onQuickReplenish={openQuickReplenish}
            onEditProduct={openEditProduct}
          />
        )}
      </main>

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        fileInputRef={fileInputRef}
        onShowToast={showToast}
      />

      <UnsavedChangesPromptModal
        isOpen={isUnsavedPromptOpen}
        fileName={dbFileName || 'inventario'}
        onClose={() => setIsUnsavedPromptOpen(false)}
        onSaveAndConfirm={async () => {
          await handleSaveCurrentDatabase();
          setIsUnsavedPromptOpen(false);
        }}
        onDiscardAndConfirm={() => {
          setIsUnsavedPromptOpen(false);
          showToast('Cambios descartados', 'info');
        }}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialProduct={editingProduct}
        categories={categories}
        allProducts={products}
      />

      <TemplateFormModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        initialTemplate={editingTemplate}
        products={products}
        allTemplates={templates}
      />

      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setSelectedProductForStock(null);
        }}
        products={products}
        selectedProduct={selectedProductForStock}
        onConfirmEntry={handleConfirmStockEntry}
        onConfirmManualExit={(params) => {
          dbService.registerManualMovement({
            tipo: 'SALIDA_MANUAL',
            motivo: params.motivo,
            cliente: params.cliente,
            items: [{ productoId: params.productoId, cantidad: params.cantidad }],
            observaciones: params.observaciones,
          });
          showToast('Salida de stock registrada', 'info');
        }}
      />

      <ExecuteInstallationModal
        isOpen={isExecuteModalOpen}
        onClose={() => {
          setIsExecuteModalOpen(false);
          setSelectedTemplateIdForExecution(undefined);
        }}
        templates={templates}
        products={products}
        initialTemplateId={selectedTemplateIdForExecution}
        onConfirmExecution={handleConfirmInstallation}
      />
    </div>
  );
}