import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import './styles/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {
  clearDevelopmentServiceWorkers,
  devServiceWorkerClearedKey,
} from './registerServiceWorker';

async function bootstrap() {
  const clearedDevelopmentState = await clearDevelopmentServiceWorkers();

  if (clearedDevelopmentState && sessionStorage.getItem(devServiceWorkerClearedKey) !== 'true') {
    sessionStorage.setItem(devServiceWorkerClearedKey, 'true');
    window.location.reload();
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.warn('Unable to clear development service worker', error);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
