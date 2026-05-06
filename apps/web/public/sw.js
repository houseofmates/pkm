self.addEventListener('install', (e) => {
  self.skipWaiting(); // force activation immediately
});

self.addEventListener('activate', (e) => {
  // immediately unregister the service worker
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url)); // force reload page
    });
});
