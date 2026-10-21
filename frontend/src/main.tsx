import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles-v2.css';

async function start() {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }
  const { App } = await import('./app/App');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void start().catch(() => {
  document.getElementById('root')!.textContent =
    'Não foi possível iniciar o BatSinal. Recarregue a página e confira se o navegador permite service workers em localhost.';
});
