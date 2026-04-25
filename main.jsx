import { createRoot } from 'react-dom/client';
import App from './recibo_yatasto.jsx';

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

createRoot(document.getElementById('root')).render(<App />);
