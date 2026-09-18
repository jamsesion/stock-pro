import React from 'react';
import { 
  Boxes, 
  PackageCheck, 
  Layers, 
  ArrowLeftRight, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Wrench,
  FolderOpen,
  Database,
  Save,
  Check,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { ActiveTab, Product } from '../types';
import { dbService } from '../services/db';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  onNewProduct: () => void;
  onExecuteInstallation: () => void;
  onNewStockEntry: () => void;
  onOpenDatabaseModal: () => void;
  onSelectDatabaseFile: () => void;
  onSaveCurrentDatabase: () => void;
  onRequestCloseApp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  products,
  onNewProduct,
  onExecuteInstallation,
  onOpenDatabaseModal,
  onSelectDatabaseFile,
  onSaveCurrentDatabase,
  onRequestCloseApp,
}) => {
  const isDbLoaded = dbService.isLoaded();
  const dbFileName = dbService.getDatabaseFileName();
  const saveStatus = dbService.getSaveStatus();
  const hasUnsavedChanges = dbService.hasUnsavedChanges();

  // Calculate low stock alerts
  const lowStockCount = products.filter(
    (p) => p.stockActual <= p.stockMinimo
  ).length;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'products',
      label: 'Productos',
      icon: <PackageCheck className="w-4 h-4" />,
      badge: isDbLoaded ? products.length : undefined,
    },
    {
      id: 'templates',
      label: 'Plantillas de Instalación',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'movements',
      label: 'Movimientos de Stock',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: 'profit',
      label: 'Panel de Ganancias',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'alerts',
      label: 'Alertas',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & App title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shadow-inner font-bold flex items-center justify-center">
              <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                  Stock<span className="text-amber-400">Pro</span>
                </span>
                {isDbLoaded ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border hidden xs:inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {hasUnsavedChanges ? 'Modificada' : 'Al Día'}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hidden xs:inline">
                    Sin Archivo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Gestión con Base de Datos Externa Portátil (.db / .json)
              </p>
            </div>
          </div>

          {/* Controls: Database Selection + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
            {isDbLoaded ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Database Pill (click to manage) */}
                <button
                  onClick={onOpenDatabaseModal}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-left transition cursor-pointer text-xs font-mono text-slate-300 hover:text-white"
                  title="Gestionar archivo o cambiar de base de datos"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="max-w-[120px] truncate">{dbFileName}</span>
                </button>

                {/* Close Database / APK Session Button */}
                <button
                  type="button"
                  id="btn-close-app-session"
                  onClick={onRequestCloseApp}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 transition cursor-pointer"
                  title="Cerrar sesión o salir de la aplicación"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* REQUIRED: Primary "Seleccionar base de datos" button when no DB is active */
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-select-database"
                  onClick={onSelectDatabaseFile}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                  title="Seleccionar archivo .db o .json de tu pendrive o disco duro"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Seleccionar base de datos</span>
                </button>

                <button
                  onClick={onOpenDatabaseModal}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Opciones de base de datos portátil (Crear nueva o demo)"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800">
              <button
                id="btn-quick-installation"
                onClick={onExecuteInstallation}
                disabled={!isDbLoaded}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                title="Registrar una instalación y descontar del stock"
              >
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Registrar</span> Instalación
              </button>

              {/* Botón Guardar Base de Datos con icono de disquete (reemplaza a + Nuevo Producto) */}
              <button
                type="button"
                id="btn-save-current-database"
                onClick={onSaveCurrentDatabase}
                disabled={!isDbLoaded}
                className={`inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 ring-2 ring-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:text-white'
                }`}
                title={
                  !isDbLoaded
                    ? 'No hay base de datos cargada'
                    : hasUnsavedChanges
                    ? `Guardar y sobrescribir en ${dbFileName}`
                    : `Base de datos guardada (${dbFileName})`
                }
                aria-label="Guardar base de datos"
              >
                {saveStatus === 'saving' ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline text-xs font-bold ml-1.5">
                  {saveStatus === 'saving'
                    ? 'Guardando...'
                    : hasUnsavedChanges
                    ? 'Guardar'
                    : 'Guardado'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      item.id === 'alerts'
                        ? 'bg-red-600 text-white animate-pulse'
                        : isActive
                        ? 'bg-slate-900 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
