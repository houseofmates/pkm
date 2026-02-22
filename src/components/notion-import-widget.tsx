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
        setRunning(true);
        appendLog('uploading...');
        const fd = new FormData();
        fd.append('file', file);
        // determine target URL from VITE_API_URL (db domain) or fallback to relative
        let envBase = import.meta.env.VITE_API_URL as string | undefined;
        if (envBase && envBase.endsWith('/')) envBase = envBase.slice(0, -1);
        let baseUrl: string;
        if (envBase) {
            baseUrl = envBase;
        } else {
            // infer backend domain from current hostname (pkm -> db)
            const { protocol, hostname } = window.location;
            let host = hostname;
            if (hostname.startsWith('pkm.')) {
                host = hostname.replace(/^pkm\./, 'db.');
            }
            baseUrl = `${protocol}//${host}/api`;
        }
        const url = `${baseUrl}/nb-import`;
        console.debug('[NotionImportWidget] env VITE_API_URL=', envBase, 'using url', url, '(legacy notion-import also accepted)');
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
            const es = new EventSource(`/api/notion-import/${data.taskId}/stream`, { withCredentials: true });
            es.onmessage = e => appendLog(e.data);
            es.addEventListener('done', () => {
                appendLog('import done');
                es.close();
                setRunning(false);
            });
            es.addEventListener('error', (e: any) => {
                appendLog('error: ' + e.data);
                es.close();
                setRunning(false);
            });
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
