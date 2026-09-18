/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { pickDatabaseFile, downloadDatabaseBlob } from './utils/fileDatabase';
import { CheckCircle, AlertCircle, Download, FileText, Save, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');

  // Reactively subscribe to dbService changes
  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const unsubscribe = dbService.subscribe(() => {
      setDbTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Restaurar automáticamente la base de datos en uso si se reabre la aplicación o APK
  useEffect(() => {
    dbService.initFromStorage();
  }, []);

  // Synchronized data from DB
  const isDbLoaded = useMemo(() => dbService.isLoaded(), [dbTick]);
  const dbFileName = useMemo(() => dbService.getDatabaseFileName(), [dbTick]);
  const saveStatus = useMemo(() => dbService.getSaveStatus(), [dbTick]);
  const hasWritable = useMemo(() => dbService.hasWritableHandle(), [dbTick]);
  const hasUnsavedChanges = useMemo(() => dbService.hasUnsavedChanges(), [dbTick]);

  const products = useMemo(() => dbService.getProducts(), [dbTick]);
  const templates = useMemo(() => dbService.getTemplates(), [dbTick]);
  const movements = useMemo(() => dbService.getMovements(), [dbTick]);

  // Derived categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.categoria))).filter(Boolean);
  }, [products]);

  // File input fallback ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
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

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Interceptar cierre de pestaña/navegador/APK si hay modificaciones sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dbService.hasUnsavedChanges()) {
        e.preventDefault();
        // Mensaje estándar para el cuadro de diálogo nativo del navegador/APK
        e.returnValue = 'Tienes cambios sin guardar en la base de datos actual. ¿Deseas salir sin guardar la última modificación?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Database operations
  const handleSelectDatabaseFile = async () => {
    try {
      const result = await pickDatabaseFile(fileInputRef.current);
      if (result) {
        const loadResult = await dbService.loadFromFile(result.file, result.handle);
        if (loadResult.success) {
          showToast(
            `Base de datos "${result.file.name}" cargada correctamente (${loadResult.stats?.products || 0} productos)`,
            'success'
          );
        } else {
          showToast(loadResult.message || 'Error al leer el archivo seleccionado', 'warning');
        }
      }
    } catch (err: any) {
      console.error('Error al seleccionar base de datos', err);
      showToast('No se pudo acceder al archivo seleccionado', 'warning');
    }
  };

  const handleFallbackFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadResult = await dbService.loadFromFile(file, null);
      if (loadResult.success) {
        showToast(
          `Base de datos "${file.name}" cargada (${loadResult.stats?.products || 0} productos)`,
          'success'
        );
      } else {
        showToast(loadResult.message || 'Error al leer el archivo', 'warning');
      }
      e.target.value = '';
    }
  };

  const handleCreateSampleDatabase = async () => {
    await dbService.createNewDatabase('inventario_solar.json', true, null);
    showToast('Base de datos de demostración cargada con materiales solares y movimientos', 'success');
  };

  // UN SOLO BOTÓN: Guardar datos en la base de datos actual que esté utilizando
  const handleSaveCurrentDatabase = async () => {
    try {
      const res = await dbService.saveCurrentDatabase();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Error al guardar la base de datos', 'warning');
      }
    } catch (err: any) {
      console.error('Error al guardar base de datos', err);
      showToast('Error al guardar datos en el archivo', 'warning');
    }
  };

  // Solicitud de cierre de sesión / APK
  const handleRequestCloseApp = () => {
    if (dbService.hasUnsavedChanges()) {
      setIsUnsavedPromptOpen(true);
    } else {
      showToast('Todos los cambios están guardados de forma segura.', 'success');
    }
  };

  // Product CRUD
  const handleSaveProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    dbService.saveProduct(productData);
    showToast(productData.id ? 'Producto actualizado en el inventario' : 'Producto añadido al inventario', 'success');
  };

  const handleDeleteProduct = (productId: string) => {
    const ok = dbService.deleteProduct(productId);
    if (ok) {
      showToast('Producto eliminado del catálogo', 'info');
    }
  };

  // Template CRUD
  const handleSaveTemplate = (templateData: Omit<InstallationTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    dbService.saveTemplate(templateData);
    showToast(templateData.id ? 'Plantilla actualizada' : 'Nueva plantilla de instalación creada', 'success');
  };

  const handleDeleteTemplate = (templateId: string) => {
    const ok = dbService.deleteTemplate(templateId);
    if (ok) {
      showToast('Plantilla de instalación eliminada', 'info');
    }
  };

  // Execute Installation
  const handleConfirmInstallation = (params: {
    plantillaId?: string;
    plantillaNombre?: string;
    motivo: string;
    cliente?: string;
    numeroFactura?: string;
    items: { productoId: string; cantidad: number }[];
    observaciones?: string;
  }) => {
    const result = dbService.executeInstallation(params);
    if (result.success && result.movement) {
      const facturaTag = result.movement.numeroFactura ? ` [${result.movement.numeroFactura}]` : '';
      showToast(`¡Instalación registrada${facturaTag}! Stock descontado (+${result.movement.gananciaTotal.toFixed(2)} €)`, 'success');
    } else {
      showToast(result.error || 'Error al ejecutar la instalación', 'warning');
    }
  };

  // Stock Entry (Recepción)
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
      showToast('Entrada de stock registrada correctamente', 'success');
    } else {
      showToast(result.error || 'Error al registrar entrada', 'warning');
    }
  };

  // Delete Stock Movement / Old Installation
  const handleDeleteMovement = (movementId: string, revertStock: boolean) => {
    const ok = dbService.deleteMovement(movementId, revertStock);
    if (ok) {
      showToast(
        revertStock
          ? 'Registro eliminado y stock de productos restaurado'
          : 'Registro eliminado del historial de movimientos',
        'info'
      );
    } else {
      showToast('No se pudo encontrar el registro a eliminar', 'warning');
    }
  };

  const handleDeleteMultipleMovements = (movementIds: string[], revertStock: boolean) => {
    const count = dbService.deleteMultipleMovements(movementIds, revertStock);
    if (count > 0) {
      showToast(
        `Se eliminaron ${count} registro(s) del historial${revertStock ? ' (stock restaurado)' : ''}`,
        'info'
      );
    }
  };

  // Quick Open Handlers
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
      {/* Hidden File Input for standard file picker fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.db,.sqlite"
        className="hidden"
        onChange={handleFallbackFileInputChange}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce shadow-xl">
          <div className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border ${
            toastMessage.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' :
            toastMessage.type === 'warning' ? 'bg-amber-900 text-amber-100 border-amber-700' :
            'bg-slate-900 text-slate-100 border-slate-700'
          }`}>
            {toastMessage.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Navbar with Single Save Button and DB Selection */}
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

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex-1">
        {/* Banner shown when NO database file is currently loaded */}
        {!isDbLoaded && (
          <DatabasePromptBanner
            onSelectExisting={handleSelectDatabaseFile}
            onOpenModal={() => setIsDatabaseModalOpen(true)}
            onCreateSample={handleCreateSampleDatabase}
          />
        )}

        {/* Stock Alerts Banner (displayed only when not on alerts tab and when DB is loaded) */}
        {isDbLoaded && activeTab !== 'alerts' && (
          <StockAlertsBanner
            products={products}
            onViewAlerts={() => setActiveTab('alerts')}
            onQuickReplenish={openQuickReplenish}
          />
        )}

        {/* Tab Views */}
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
          />
        )}

        {activeTab === 'profit' && (
          <ProfitDashboardView movements={movements} />
        )}

        {activeTab === 'alerts' && (
          <StockAlertsView
            products={products}
            onQuickReplenish={openQuickReplenish}
            onEditProduct={openEditProduct}
          />
        )}
      </main>

      {/* Database Modal */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        fileInputRef={fileInputRef}
        onShowToast={showToast}
      />

      {/* Unsaved Changes Confirmation Modal before exiting/closing */}
      <UnsavedChangesPromptModal
        isOpen={isUnsavedPromptOpen}
        fileName={dbFileName || 'inventario'}
        onClose={() => setIsUnsavedPromptOpen(false)}
        onSaveAndConfirm={async () => {
          await handleSaveCurrentDatabase();
          setIsUnsavedPromptOpen(false);
          showToast('Cambios guardados con éxito en la aplicación.', 'success');
        }}
        onDiscardAndConfirm={() => {
          setIsUnsavedPromptOpen(false);
          showToast('Ventana cerrada.', 'info');
        }}
      />

      {/* Other Modals */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialProduct={editingProduct}
        categories={categories}
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
          showToast('Salida de stock registrada en el historial', 'info');
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
