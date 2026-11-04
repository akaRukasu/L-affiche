import { fetchGuide } from './guide.js';
self.onmessage = async () => {
  try { self.postMessage({ guide: await fetchGuide() }); }
  catch (error) { self.postMessage({ error: error.message || 'Connexion au guide impossible.' }); }
};
