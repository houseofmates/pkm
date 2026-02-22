import React from 'react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { NotionImportWidget } from '@/components/notion-import-widget';

export default function SettingsPage() {
    const [apiKey, setApiKey] = useAppSetting('apiKey', '');
    const [darkMode, setDarkMode] = useAppSetting('darkMode', false);
    const [pageSize, setPageSize] = useAppSetting('defaultPageSize', 20);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold lowercase">settings</h1>

            <section className="mt-6 space-y-4">
                <h2 className="text-lg font-semibold lowercase">general</h2>
                <div className="space-y-2">
                    <label className="flex flex-col text-sm lowercase">
                        api key
                        <input
                            type="text"
                            value={apiKey as string}
                            onChange={e => setApiKey(e.target.value)}
                            className="mt-1 px-2 py-1 bg-background border border-border rounded w-full"
                        />
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
                {!(apiKey as string) ? (
                    <p className="italic text-sm text-red-500 lowercase">set your api key above to enable notion import</p>
                ) : null}
                <NotionImportWidget />
            </section>
        </div>
    );
}
