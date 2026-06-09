import { createRoot } from 'react-dom/client';
import App from './recibo_yatasto.jsx';
import { ToastProvider } from './components/Toast.jsx';

// Polyfill window.storage with localStorage for standalone preview
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(key);
      return value != null ? { value } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
    },
  };
}

// Estilos globales: animación del Toast + a11y (focus ring, reduced motion).
//
// - Focus visible 2px brand sobre cualquier elemento interactivo. Sólo aparece
//   con navegación por teclado (:focus-visible), no con clicks del mouse.
// - prefers-reduced-motion: deshabilita animaciones decorativas en toasts,
//   spinners y transiciones. Cumple WCAG 2.3.3.
const _globalStyle = document.createElement("style");
_globalStyle.textContent = `
@keyframes yatasto-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
  border-radius: 4px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
document.head.appendChild(_globalStyle);

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
