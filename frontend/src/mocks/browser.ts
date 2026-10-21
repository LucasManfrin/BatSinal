import { setupWorker } from 'msw/browser';
import { handlers, heartbeat } from './handlers';
import { store, STORAGE_KEY, migrateStore } from './seed';

export const worker = setupWorker(...handlers);
// Como um dispositivo, o mock repete leituras mesmo sem mudança de ocupação.
heartbeat();
window.setInterval(heartbeat, 10000);
// Outra aba pode criar uma sessão ou alterar cadastros. Consultas nunca sobrescrevem o store persistido.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    Object.assign(store, migrateStore(JSON.parse(event.newValue)));
  } catch {
    /* Ignora dados locais corrompidos. */
  }
});
