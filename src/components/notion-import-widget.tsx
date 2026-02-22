import { useState } from 'react';

export function NotionImportWidget() {
    const [file, setFile] = useState<File | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);

    const appendLog = (msg: string) => {
        setLogs(l => [...l, msg]);
    };

    const startImport = async () => {
        if (!file) return;
        const apiKey = localStorage.getItem('hom_api_key');
        if (!apiKey) {
            appendLog('error: missing API key (go to settings to set hom_api_key)');
            return;
        }
        setRunning(true);
        appendLog('uploading...');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch('/api/notion-import', {
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
