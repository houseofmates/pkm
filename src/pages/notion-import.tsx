import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotionImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const navigate = useNavigate();

    const appendLog = (msg: string) => {
        setLogs(l => [...l, msg]);
    };

    const startImport = async () => {
        if (!file) return;
        setRunning(true);
        appendLog('uploading...');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch('/api/notion-import', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${localStorage.getItem('hom_api_key')}` } });
            const data = await res.json();
            if (!data.taskId) throw new Error('no task id');
            appendLog(`task ${data.taskId} started`);
            const es = new EventSource(`/api/notion-import/${data.taskId}/stream`, { withCredentials: true });
            es.onmessage = e => appendLog(e.data);
            es.addEventListener('done', () => {
                appendLog('import done');
                es.close();
                setRunning(false);
            });
            es.addEventListener('error', (e:any) => {
                appendLog('error: ' + e.data);
                es.close();
                setRunning(false);
            });
        } catch (err:any) {
            appendLog('upload failed: ' + err.message);
            setRunning(false);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold lowercase">notion import</h1>
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
                <button
                    className="ml-2 px-3 py-1 bg-gray-600 text-white lowercase rounded"
                    onClick={() => navigate(-1)}
                    disabled={running}
                >
                    cancel
                </button>
            </div>
            <pre className="mt-4 bg-black/10 p-2 h-40 overflow-auto lowercase text-xs">
                {logs.join('\n')}
            </pre>
        </div>
    );
}
