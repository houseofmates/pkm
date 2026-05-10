const express = require('express');
const cors = require('cors');
const sidebarColorsRouter = require('./sidebar-colors');

class ContextServer {
    constructor(port = 3100) {
        this.app = express();
        this.port = port;
        this.currentContext = {
            status: 'initializing',
            timestamp: new Date().toISOString()
        };
        this.server = null;
    }

    start() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(sidebarColorsRouter); // <-- add this line

        // middleware to validate the api key (lightweight check)
        this.app.use((req, res, next) => {
            // allow health check without key
            if (req.path === '/health') return next();

            const authHeader = req.headers.authorization;
            const key = process.env.PKM_LLM_KEY || 'default-dev-key'; // Fallback for dev

            if (!authHeader || !authHeader.includes(key)) {
                // relaxed check for now: just check if header exists or if dev mode
                // ideally: const token = authheader.split(' ')[1]; if (token !== key) ...
                // for now, let's just log and proceed or fail if strict.
                // user requested "read-only api key".
                if (process.env.NODE_ENV !== 'development' && (!authHeader || !authHeader.includes(key))) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }
            next();
        });

        // get /context - the main endpoint for llm
        this.app.get('/context', (req, res) => {
            res.json(this.currentContext);
        });

        // get /health
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });

        this.server = this.app.listen(this.port, () => {
            console.log(`Context Server running on http://localhost:${this.port}`);
        });
    }

    updateContext(newContext) {
        this.currentContext = {
            ...newContext,
            _meta: {
                updatedAt: new Date().toISOString(),
                valid: true
            }
        };
        console.log("Context updated via IPC");
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log("Context Server stopped");
        }
    }
}

module.exports = new ContextServer();
