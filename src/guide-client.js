import GuideWorker from './guide-worker.js?worker&inline';
export function downloadGuide() {
  return new Promise((resolve, reject) => {
    // Decompress and parse the complete France guide away from the UI thread.
    // A self-contained Blob worker also works with WKWebView's custom capacitor URL scheme.
    const worker = new GuideWorker();
    const timer = setTimeout(() => finish(new Error('Le chargement du guide a pris trop de temps.')), 100000);
    function finish(error, guide) {
      clearTimeout(timer); worker.terminate();
      if (error) reject(error); else resolve(guide);
    }
    worker.onmessage = event => finish(event.data.error ? new Error(event.data.error) : null, event.data.guide);
    worker.onerror = () => finish(new Error('Impossible de charger le guide. Réessayez avec une connexion disponible.'));
    worker.postMessage('load');
  });
}
