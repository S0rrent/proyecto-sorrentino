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

// Animación reutilizada por el viewport de Toast (overlay flotante).
const _toastStyle = document.createElement("style");
_toastStyle.textContent = `
@keyframes yatasto-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  [role="status"] { animation: none !important; }
}
`;
document.head.appendChild(_toastStyle);

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
