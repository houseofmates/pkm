import { useState } from 'react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { maskString } from '@/lib/sanitize-utils';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';

type LocationOverride = { host?: string; hostname?: string; origin?: string; protocol?: string };

declare global {
     
    var __HOM_TEST_LOCATION__: LocationOverride | undefined;
     
    var __HOM_TEST_BACKEND_URL__: string | undefined;
}

const getRuntimeLocation = () => {
    if (globalThis.__HOM_TEST_LOCATION__) {
        const override = globalThis.__HOM_TEST_LOCATION__;
        return {
            host: override.host || '',
            hostname: override.hostname || '',
            origin: override.origin || '',
            protocol: override.protocol || '',
        };
    }
    if (typeof window !== 'undefined' && window.location) {
        const { host = '', hostname = '', origin = '', protocol = '' } = window.location;
        return { host, hostname, origin, protocol };
    }
    return { host: '', hostname: '', origin: '', protocol: '' };
};

const resolveBackendBaseUrl = () => {
    // support older tests and configs that set VITE_API_URL (nocobase) as well
    const overrideBackend = globalThis.__HOM_TEST_BACKEND_URL__;
    const rawApiEnv = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITE_API_URL)
      || (import.meta.env as any).VITE_API_URL;
    const rawBackendEnv = overrideBackend ?? (import.meta.env as any).VITE_BACKEND_URL;
    // prefer explicit backend override, otherwise fall back to api env for legacy behavior
    const rawEnv = rawBackendEnv ?? rawApiEnv;
    let envBase = rawEnv;
    if (envBase && typeof envBase === 'string' && envBase.endsWith('/')) envBase = envBase.slice(0, -1);

    // log the raw value for backwards-compatible tests that expect this message
    try {
        secureLogger.debug('[NotionImportWidget] raw VITE_API_URL=', rawApiEnv, 'env VITE_API_URL=', envBase ? String(envBase).replace(/\/$/, '') : envBase);
    } catch (e) {
        // ignore
    }

    if (envBase && typeof envBase === 'string' && envBase.startsWith('http')) {
        const runtimeLoc = getRuntimeLocation();
        const hostLower = (runtimeLoc.host || runtimeLoc.hostname || '').toLowerCase();
        const envHost = new URL(envBase).host.toLowerCase();
        const officialHosts = ['api.houseofmates.space', 'api.houseofmates.app'];
        const isOfficial = officialHosts.includes(envHost);
        const isPkmSubdomain = hostLower.endsWith('.houseofmates.space') && !hostLower.startsWith('api.');
        if (isOfficial && isPkmSubdomain) {
            return { baseUrl: '/api', rawEnv, envBase, source: 'backend' as const };
        }
        return { baseUrl: envBase, rawEnv, envBase, source: 'backend' as const };
    }

    // default to backend import handler behaviour
    return { baseUrl: '/api', rawEnv, envBase, source: 'backend' as const };
};

export function NotionImportWidget() {
    const [files, setFiles] = useState<File[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const [preview, setPreview] = useState<{ name: string; relations?: Array<{ field: string; target: string }> }[]>([]);
    const [lastTaskId, setLastTaskId] = useState<string | null>(null);
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
        // reject files that are too small (likely invalid HTML or truncated)
        const minSize = 64; // bytes
        if (files.some(f => f.size < minSize)) {
            appendLog('error: one or more files are too small to be valid');
            return;
        }
        // prefer the PKM app setting but fall back to known localStorage keys
        let apiKey: string | null | undefined = appApiKey ||
            storageManager.getItem('hom_api_key') ||
            storageManager.getItem('nocobase_token') ||
            storageManager.getItem('nocobase_api_key');
        // sometimes storage contains the literal string "null" or "undefined";
        // treat those as empty.
        if (apiKey === 'null' || apiKey === 'undefined') apiKey = '';
        if (import.meta.env.DEV) {
            secureLogger.debug('[NotionImportWidget] using apiKey', apiKey && maskString(apiKey));
        }
        if (!apiKey) {
            appendLog('error: missing API key (set in settings or hom_api_key/localStorage)');
            return;
        }
        appendLog(`using api key ${maskString(apiKey)}`);
        files.forEach(f => {
            if (import.meta.env.DEV) {
                secureLogger.debug('[NotionImportWidget] file size', f.size, 'name', f.name, 'type', f.type);
            }
            if (!f.name.toLowerCase().endsWith('.csv')) {
                appendLog(`warning: file ${f.name} is not a CSV`);
            }
        });
        // inspect the first few bytes of each file to warn if it looks like an HTML error page
        for (const f of files) {
            try {
                const sl = f.slice(0, 32);
                let hdr = '';
                if ((sl as any).text) {
                    hdr = await (sl as any).text();
                } else if ((sl as any).arrayBuffer) {
                    const buf = await (sl as any).arrayBuffer();
                    hdr = new TextDecoder().decode(new Uint8Array(buf));
                }
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
        setPreview([]);
        appendLog('uploading...');
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f, f.name));
        // determine the backend URL for handling imports. this is **not** the
        // nocobase API (VITE_API_URL) but the PKM backend service. the latter
        // is exposed via VITE_BACKEND_URL or proxied under `/api` in dev.
        const { baseUrl, rawEnv, envBase, source } = resolveBackendBaseUrl() as any;
        const url = (source === 'api') ? `${baseUrl}/nb-import` : `${baseUrl}/nb-import-csv`;
        if (import.meta.env.DEV) {
            secureLogger.debug('[NotionImportWidget] using backend', rawEnv ?? envBase, 'using url', url, `(source=${source})`);
        }
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: fd,
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!res.ok) {
                let text = '';
                try { text = await res.text(); } catch { /* ignore text read error */ }
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
            setLastTaskId(data.taskId);
            if (Array.isArray(data.databases)) {
                setPreview(data.databases.map((d: any) => ({ name: d.name, relations: d.relations })));
            }

            // poll for progress lines
            let pollTimer: any;
            let pollTimeout: any;
            let lastLogCount = 0;
            const pollLogs = async () => {
                try {
                    if (source === 'api') {
                        const pollUrl = `${baseUrl}/nb-import/logs`;
                        const pres = await fetch(pollUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                            body: JSON.stringify({ id: data.taskId })
                        });
                        if (!pres.ok) {
                            secureLogger.warn('[NotionImportWidget] poll log failed', pres.statusText);
                            return;
                        }
                        const pdata = await pres.json();
                        if (pdata.logs && Array.isArray(pdata.logs)) {
                            const newLogs = pdata.logs.slice(lastLogCount);
                            if (newLogs.length > 0) {
                                setLogs(l => [...l, ...newLogs]);
                                lastLogCount = pdata.logs.length;
                            }
                        }
                        if (pdata.status === 'done') {
                            appendLog('import task finished successfully.');
                            clearInterval(pollTimer);
                            clearTimeout(pollTimeout);
                            setRunning(false);
                        } else if (pdata.status === 'error') {
                            appendLog('import task failed during background processing.');
                            clearInterval(pollTimer);
                            clearTimeout(pollTimeout);
                            setRunning(false);
                        }
                        return;
                    }
                    // backend/csv import behaviour: GET logs?id=...
                    const pollUrl = `${baseUrl}/nb-import/logs?id=${encodeURIComponent(data.taskId)}`;
                    const pres = await fetch(pollUrl, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (!pres.ok) {
                        secureLogger.warn('[NotionImportWidget] poll log failed', pres.statusText);
                        return;
                    }
                    const pdata = await pres.json();
                    if (pdata.logs && Array.isArray(pdata.logs)) {
                        const newLogs = pdata.logs.slice(lastLogCount);
                        if (newLogs.length > 0) {
                            setLogs(l => [...l, ...newLogs]);
                            lastLogCount = pdata.logs.length;
                        }
                    }
                    if (pdata.status === 'done') {
                        appendLog('import task finished successfully.');
                        clearInterval(pollTimer);
                        clearTimeout(pollTimeout);
                        setRunning(false);
                    } else if (pdata.status === 'error') {
                        appendLog('import task failed during background processing.');
                        clearInterval(pollTimer);
                        clearTimeout(pollTimeout);
                        setRunning(false);
                    }
                } catch (e) {
                    if (import.meta.env.DEV) secureLogger.warn('[NotionImportWidget] polling error', e);
                }
            };

            pollTimer = setInterval(pollLogs, 2000);
            pollTimeout = setTimeout(() => {
                appendLog('polling timed out; you can retry polling.');
                clearInterval(pollTimer);
                setRunning(false);
            }, 45_000);
        } catch (err: any) {
            appendLog('upload failed: ' + err.message);
            setRunning(false);
        }
    };

    const retryPoll = async () => {
        if (!lastTaskId) return;
        appendLog(`retrying poll for task ${lastTaskId}...`);
        setRunning(true);
        // reuse most recent API key lookup
        const apiKey = appApiKey ||
            storageManager.getItem('hom_api_key') ||
            storageManager.getItem('nocobase_token') ||
            storageManager.getItem('nocobase_api_key');
        const { baseUrl, source } = resolveBackendBaseUrl() as any;
        try {
            if (source === 'api') {
                const pollUrl = `${baseUrl}/nb-import/logs`;
                const pres = await fetch(pollUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({ id: lastTaskId })
                });
                if (!pres.ok) {
                    appendLog(`poll retry failed: ${pres.status} ${pres.statusText}`);
                    setRunning(false);
                    return;
                }
                const pdata = await pres.json();
                if (pdata.logs && Array.isArray(pdata.logs)) {
                    setLogs(pdata.logs);
                }
                appendLog(`poll retry status: ${pdata.status || 'unknown'}`);
            } else {
                const pollUrl = `${baseUrl}/nb-import/logs?id=${encodeURIComponent(lastTaskId)}`;
                const pres = await fetch(pollUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
                if (!pres.ok) {
                    appendLog(`poll retry failed: ${pres.status} ${pres.statusText}`);
                    setRunning(false);
                    return;
                }
                const pdata = await pres.json();
                if (pdata.logs && Array.isArray(pdata.logs)) {
                    setLogs(pdata.logs);
                }
                appendLog(`poll retry status: ${pdata.status || 'unknown'}`);
            }
        } catch (e: any) {
            appendLog('poll retry error: ' + e.message);
        } finally {
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
            {!!preview.length && (
                <div className="mt-3 text-xs lowercase bg-black/20 p-2 rounded">
                    <div className="font-semibold mb-1">inferred collections</div>
                    <ul className="space-y-1">
                        {preview.map((p) => (
                            <li key={p.name}>
                                <span className="font-semibold">{p.name}</span>
                                {p.relations?.length ? (
                                    <span className="ml-1 text-[11px] text-gray-300">relations: {p.relations.map(r => `${r.field}→${r.target}`).join(', ')}</span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {lastTaskId && !running && (
                <div className="mt-2">
                    <button
                        className="px-3 py-1 bg-slate-700 text-white lowercase rounded disabled:opacity-50"
                        onClick={retryPoll}
                        disabled={running}
                    >
                        retry poll
                    </button>
                </div>
            )}
            <pre className="mt-4 bg-black/10 p-2 h-40 overflow-auto lowercase text-xs">
                {logs.join('\n')}
            </pre>
        </div>
    );
}
