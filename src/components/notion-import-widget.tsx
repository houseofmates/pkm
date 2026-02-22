import { useState } from 'react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { maskString } from '@/lib/sanitize-utils';

export function NotionImportWidget() {
    const [file, setFile] = useState<File | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const [appApiKey] = useAppSetting('apiKey', '');

    const appendLog = (msg: string) => {
        setLogs(l => [...l, msg]);
    };

    const startImport = async () => {
        if (!file) return;
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
        // sanity check the selected file before we POST it. smaller than 1KB
        // is almost never a valid Notion export, and we also verify the ZIP
        // magic bytes so we don't end up sending an HTML page through the
        // proxy (which is what was happening).
        if (file.size < 1024) {
            appendLog('error: file appears too small to be a Notion export');
            return;
        }
        try {
            const hdr = await file.slice(0, 4).arrayBuffer();
            const bytes = new Uint8Array(hdr);
            if (!(bytes[0] === 0x50 && bytes[1] === 0x4B)) {
                appendLog('error: selected file does not appear to be a ZIP');
                return;
            }
        } catch (e) {
            // some test environments (jsdom) don’t support blob.arrayBuffer()
            // and will throw; in that case just log a warning and continue.
            console.warn('[NotionImportWidget] header check failed', e);
        }
        setRunning(true);
        appendLog('uploading...');
        const fd = new FormData();
        fd.append('file', file);
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
        const url = `${baseUrl}/nb-import`;
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
            const poll = async () => {
                try {
                    // Post body is less likely to trigger Cloudflare WAF rules than a
                    // suspicious-looking query string. if the POST itself fails with
                    // a 500 we fall back to the previous GET form so we don't break
                    // the widget for older browsers or edge cases.
                    let r;
                    try {
                        r = await fetch(`${baseUrl}/nb-import/logs`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({ id: data.taskId })
                        });
                    } catch (e) {
                        // network error in POST, we'll treat it below
                        r = null;
                    }
                    if (!r || r.status === 500) {
                        // try legacy GET as a fallback
                        r = await fetch(`${baseUrl}/nb-import/logs?id=${data.taskId}`, {
                            headers: { Authorization: `Bearer ${apiKey}` }
                        });
                    }
                    if (!r) {
                        appendLog('log fetch failed: network error');
                        return;
                    }
                    if (!r.ok) {
                        appendLog(`log fetch failed: ${r.status}`);
                        return;
                    }
                    const body = await r.json();
                    if (Array.isArray(body.logs)) {
                        body.logs.forEach((l: string) => appendLog(l));
                    }
                    if (body.status === 'done') {
                        appendLog('import done');
                        setRunning(false);
                        clearInterval(interval);
                    }
                    if (body.status === 'error') {
                        appendLog('import failed');
                        setRunning(false);
                        clearInterval(interval);
                    }
                } catch (err: any) {
                    appendLog('log fetch error: ' + err.message);
                }
            };
            const interval = setInterval(poll, 2000);
            poll();
        } catch (err: any) {
            appendLog('upload failed: ' + err.message);
            setRunning(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-[#050505]">
            <h2 className="text-lg font-semibold lowercase">notion import</h2>
            <p className="mb-4 lowercase">upload a Notion export ZIP to import into pkm.</p>
            <input
                type="file"
                accept=".zip"
                onChange={e => setFile(e.target.files?.[0] || null)}
                disabled={running}
            />
            <div className="mt-2">
                <button
                    className="px-3 py-1 bg-primary text-white lowercase rounded disabled:opacity-50"
                    onClick={startImport}
                    disabled={!file || running}
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
