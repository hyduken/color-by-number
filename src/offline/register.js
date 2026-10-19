export async function initOffline(onStatus) {
  const unavailable = () => onStatus('We couldn’t save the app for offline use. You can still color while connected to the internet.');
  if (!('serviceWorker' in navigator)) return unavailable();
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    if (registration.installing) {
      const installing = registration.installing;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'redundant' && !registration.active) unavailable();
      });
    }
    const active = await navigator.serviceWorker.ready;
    const check = () => {
      const worker = navigator.serviceWorker.controller || active.active;
      if (!worker) return unavailable();
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); unavailable(); }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        onStatus(event.data.ready ? 'Ready offline' : 'Some app files are missing. Connect to the internet and reload the page.');
      };
      worker.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
    };
    navigator.serviceWorker.addEventListener('controllerchange', check);
    check();
  } catch {
    unavailable();
  }
}
