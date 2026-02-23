import { useState } from 'react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { maskString } from '@/lib/sanitize-utils';

export function NotionImportWidget() {
    const [files, setFiles] = useState<File[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const [appApiKey] = useAppSetting('apiKey', '');

    const appendLog = (msg: string) => {
        setLogs(l => [...l, msg]);
    };

    const startImport = async () => {
        if (!files.length) return;
        if (files.length > 60) {
            appendLog('error: too many files (max 60)');
            return;
        }
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > 230 * 1024) {
            appendLog('error: total upload exceeds 230kb');
            return;
        }
        // prefer the PKM app setting but fall back to known localStorage keys
        let apiKey: string | null | undefined = appApiKey ||
            localStorage.getItem('hom_api_key') ||
            localStorage.getItem('nocobase_token') ||
            localStorage.getItem('nocobase_api_key');
        // sometimes storage contains the literal string "null" or "undefined";
        // treat those as empty.
        if (apiKey === 'null' || apiKey === 'undefined') apiKey = '';
        console.debug('[NotionImportWidget] using apiKey', apiKey && maskString(apiKey));
        if (!apiKey) {
            appendLog('error: missing API key (set in settings or hom_api_key/localStorage)');
            return;
        }
        appendLog(`using api key ${maskString(apiKey)}`);
        files.forEach(f => {
            console.debug('[NotionImportWidget] file size', f.size, 'name', f.name, 'type', f.type);
            if (!f.name.toLowerCase().endsWith('.csv')) {
                appendLog(`warning: file ${f.name} is not a CSV`);
            }
        });
        // inspect the first few bytes of each file to warn if it looks like an HTML error page
        for (const f of files) {
            try {
                const hdr = await f.slice(0, 32).text();
                const trimmed = hdr.trimStart().toLowerCase();
                if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
                    appendLog(`error: file ${f.name} appears to be an HTML page, not a valid CSV`);
                    return;
                }
            } catch (e) {
                appendLog(`warning: could not inspect file header for ${f.name}; uploading anyway`);
            }
        }
        setRunning(true);
        appendLog('uploading...');
        const fd = new FormData();
        files.forEach((f, i) => fd.append('files', f, f.name));
        // determine target API base from VITE_API_URL or default to the
        // same‑origin `/api` path. previously we rewrote the frontend host
        // (`pkm.` -> `db.`) which forced cross‑origin requests and broke
        // when the API is behind Cloudflare, so prefer relative unless
        // the environment variable tells us something genuinely external.
        let rawEnv = import.meta.env.VITE_API_URL as string | undefined;
        let envBase = rawEnv;
        if (envBase && envBase.endsWith('/')) envBase = envBase.slice(0, -1);
        // old bundles might still use the legacy `db.houseofmates.space`
        // name; rewrite it to the public API domain so clients don't break.
        if (envBase && envBase.includes('db.houseofmates.space')) {
            envBase = envBase.replace('db.houseofmates.space', 'api.houseofmates.space');
        }
        // if the env var points at the canonical api domain but we're
        // already running on a houseofmates subdomain, just use the
        // relative path to avoid cross‑origin preflights that Cloudflare
        // will 502. this handles the common case where the variable is
        // injected by default at build time.
        if (envBase) {
            try {
                const u = new URL(envBase);
                if (u.hostname === 'api.houseofmates.space' &&
                    window.location.hostname.endsWith('.houseofmates.space') &&
                    window.location.hostname !== u.hostname) {
                    envBase = '';
                }
            } catch {
                // ignore invalid URLs, we'll treat it as a relative path
                // below which is harmless
            }
        }
        let baseUrl: string;
        if (envBase) {
            baseUrl = envBase;
        } else {
            const { protocol, hostname } = window.location;
            // production handle: houseofmates.space frontend proxies /api to the
            // real API; if we're on that domain, a relative path is fine. when
            // running on some other host (e.g. pkmsandbox.example.com) there
            // is no proxy so we fall back to the old pkm->db inference logic.
            if (!hostname.endsWith('.houseofmates.space')) {
                let host = hostname;
                if (hostname.startsWith('pkm.')) {
                    host = hostname.replace(/^pkm\./, 'db.');
                }
                baseUrl = `${protocol}//${host}/api`;
            } else {
                baseUrl = '/api';
            }
        }
        const url = `http://localhost:4100/nb-import-csv`;
        console.debug('[NotionImportWidget] raw VITE_API_URL=', rawEnv, 'env VITE_API_URL=', envBase, 'using url', url, '(legacy notion-import also accepted)');
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: fd,
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!res.ok) {
                let text = '';
                try { text = await res.text(); } catch {}
                appendLog(`upload failed: ${res.status} ${text || res.statusText}`);
                setRunning(false);
                return;
            }
            let data: any;
            try {
                data = await res.json();
            } catch (e) {
                appendLog('upload failed: invalid JSON response from server');
                setRunning(false);
                return;
            }
            if (!data.taskId) {
                appendLog('upload failed: missing task id in response');
                setRunning(false);
                return;
            }
            appendLog(`task ${data.taskId} started`);
            // poll for progress lines every couple seconds
            // TODO: update log polling for nb-import-csv endpoint
        } catch (err: any) {
            appendLog('upload failed: ' + err.message);
            setRunning(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-[#050505]">
            <h2 className="text-lg font-semibold lowercase">notion csv import</h2>
            <p className="mb-4 lowercase">upload up to 60 csv files (max 230kb total) to import notion databases into pkm. fields/properties will be mapped automatically.</p>
            <input
                type="file"
                accept=".csv"
                multiple
                onChange={e => setFiles(Array.from(e.target.files || []))}
                disabled={running}
            />
            <div className="mt-2">
                <button
                    className="px-3 py-1 bg-primary text-white lowercase rounded disabled:opacity-50"
                    onClick={startImport}
                    disabled={!files.length || running}
                >
                    {running ? 'importing...' : 'start import'}
                </button>
            </div>
            <pre className="mt-4 bg-black/10 p-2 h-40 overflow-auto lowercase text-xs">
                {logs.join('\n')}
            </pre>
        </div>
    );
}
