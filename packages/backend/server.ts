app.use(cors(backendConfig.http.cors));
app.use(bodyParser.json({ limit: backendConfig.http.limit }));

const indexer = new LanceIndexer(backendConfig.paths.lanceDb);
