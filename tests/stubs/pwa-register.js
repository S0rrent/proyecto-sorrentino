// Stub del módulo virtual "virtual:pwa-register/react" (vite-plugin-pwa) para
// vitest: el plugin PWA no corre en tests, pero recibo_yatasto.jsx lo importa.
export const useRegisterSW = () => ({
  needRefresh: [false, () => {}],
  offlineReady: [false, () => {}],
  updateServiceWorker: async () => {},
});
