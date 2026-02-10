self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (e) => {
  // IMMEDIATELY UNREGISTER SELF
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url)); // Force reload page
    });
});
