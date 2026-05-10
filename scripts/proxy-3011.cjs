const http = require('http');
const { URL } = require('url');

const TARGET = { host: '127.0.0.1', port: 3010 };
const PORT = 3011;

const server = http.createServer((req, res) => {
  const options = {
    hostname: TARGET.host,
    port: TARGET.port,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (pres) => {
    res.writeHead(pres.statusCode, pres.headers);
    pres.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    res.writeHead(502);
    res.end('Bad gateway: ' + err.message);
  });

  req.pipe(proxy, { end: true });
});

server.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT} -> http://${TARGET.host}:${TARGET.port}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
