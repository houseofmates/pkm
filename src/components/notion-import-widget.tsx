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
        files.forEach((f) => fd.append('files', f, f.name));
        // determine the backend URL for handling imports. this is **not** the
        // nocobase API (VITE_API_URL) but the PKM backend service. the latter
        // is exposed via VITE_BACKEND_URL or proxied under `/api` in dev.
        let rawEnv = import.meta.env.VITE_BACKEND_URL as string | undefined;
        let envBase = rawEnv;
        if (envBase && envBase.endsWith('/')) envBase = envBase.slice(0, -1);

        let baseUrl: string;
        if (envBase && envBase.startsWith('http')) {
            baseUrl = envBase;
        } else {
            // fallback to relative `/api` which the dev server proxies to backend
            baseUrl = '/api';
        }
        const url = `${baseUrl}/nb-import-csv`;
        console.debug('[NotionImportWidget] raw VITE_BACKEND_URL=', rawEnv, 'env BACKEND_URL=', envBase, 'using url', url, '(legacy notion-import also accepted)');
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: fd,
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            if (!res.ok) {
                let text = '';
                try { text = await res.text(); } catch { }
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

            // poll for progress lines
            let pollTimer: any;
            let lastLogCount = 0;
            const pollLogs = async () => {
                try {
                    const pollUrl = `${baseUrl}/nb-import/logs?id=${encodeURIComponent(data.taskId)}`;
                    const pres = await fetch(pollUrl, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (!pres.ok) {
                        console.warn('[NotionImportWidget] poll log failed', pres.statusText);
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
                        setRunning(false);
                    } else if (pdata.status === 'error') {
                        appendLog('import task failed during background processing.');
                        clearInterval(pollTimer);
                        setRunning(false);
                    }
                } catch (e) {
                    console.warn('[NotionImportWidget] polling error', e);
                }
            };

            pollTimer = setInterval(pollLogs, 2000);
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
