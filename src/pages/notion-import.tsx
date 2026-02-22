import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotionImportWidget } from '@/components/notion-import-widget';

export default function NotionImportPage() {
    const navigate = useNavigate();

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold lowercase flex items-center justify-between">
                notion import
                <button
                    className="ml-2 px-3 py-1 bg-gray-600 text-white lowercase rounded"
                    onClick={() => navigate(-1)}
                >
                    back
                </button>
            </h1>
            <NotionImportWidget />
        </div>
    );
}
