import { useAppSetting } from '@/hooks/use-app-setting';
import { NotionImportWidget } from '@/components/notion-import-widget';
import { TableManager } from '@/features/table-management/TableManager';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [apiKey, setApiKey] = useAppSetting('apiKey', '');
    const [darkMode, setDarkMode] = useAppSetting('darkMode', (() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark')
                || localStorage.getItem('theme') === 'dark'
                || window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    })());
    const [pageSize, setPageSize] = useAppSetting('defaultPageSize', 20);
    const [showApiKey, setShowApiKey] = useState(false);

    // Apply dark mode class to document based on setting
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        // container must occupy full height of parent so scrolling works
        <div className="h-full flex flex-col overflow-auto p-4 min-h-0">
            <h1 className="text-xl font-bold lowercase">settings</h1>

            <section className="mt-6 space-y-4">
                <h2 className="text-lg font-semibold lowercase">general</h2>
                <div className="space-y-2">
                    <label className="flex flex-col text-sm lowercase">
                        api key
                        <div className="relative mt-1">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey as string}
                                onChange={e => setApiKey(e.target.value)}
                                className="px-2 py-1 bg-background border border-border rounded w-full pr-10"
                                placeholder="enter your api key"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full w-10 opacity-50 hover:opacity-100"
                                onClick={() => setShowApiKey(!showApiKey)}
                                title={showApiKey ? 'hide api key' : 'show api key'}
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </label>
                    <label className="flex items-center gap-2 text-sm lowercase">
                        <input
                            type="checkbox"
                            checked={!!darkMode}
                            onChange={e => setDarkMode(e.target.checked)}
                        />
                        dark mode
                    </label>
                    <label className="flex flex-col text-sm lowercase">
                        default page size
                        <input
                            type="number"
                            value={pageSize as number}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="mt-1 px-2 py-1 bg-background border border-border rounded w-full"
                        />
                    </label>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-lg font-semibold lowercase">data management</h2>
                <TableManager />
            </section>

            <section className="mt-8">
                {!(apiKey as string) ? (
                    <p className="italic text-sm text-red-500 lowercase">set your api key above to enable notion import</p>
                ) : null}
                <NotionImportWidget />
            </section>
        </div>
    );
}
