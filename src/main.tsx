import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dbService } from './services/db';

// Exponer el servicio de base de datos en window para debugging desde la consola.
// Esto permite inspeccionar el estado de la BD, ver la empresa, forzar guardados, etc.
// Solo afecta a la consola del desarrollador; no cambia el comportamiento de la app.
if (typeof window !== 'undefined') {
  (window as any).dbService = dbService;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);