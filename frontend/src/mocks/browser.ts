import { setupWorker } from 'msw/browser';
import { handlers, heartbeat } from './handlers';
import { store, STORAGE_KEY, type MockStore } from './seed';

export const worker = setupWorker(...handlers);
// Como um dispositivo, o mock repete leituras mesmo sem mudança de ocupação.
heartbeat();
window.setInterval(heartbeat, 10000);
// Outra aba pode criar uma sessão ou alterar cadastros. Consultas nunca sobrescrevem o store persistido.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    Object.assign(store, JSON.parse(event.newValue) as MockStore);
  } catch {
    /* Ignora dados locais corrompidos. */
  }
});
