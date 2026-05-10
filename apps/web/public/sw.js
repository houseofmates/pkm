self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (e) => {
  // immediately unregister the service worker
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url)); // Force reload page
    });
});
