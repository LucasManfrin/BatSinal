import { setupWorker } from 'msw/browser';
import { handlers, heartbeat } from './handlers';

export const worker = setupWorker(...handlers);
// Como um dispositivo, o mock repete leituras mesmo sem mudança de ocupação.
heartbeat();
window.setInterval(heartbeat, 10000);
