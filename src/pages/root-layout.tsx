
import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { DatabasesPage } from '@/pages/databases';
import { HomePage } from '@/pages/home';
import { HeadmatesPage } from '@/pages/headmates';

export function RootLayout() { // Exported as RootLayout
    const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates'>('databases');

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans lowercase-mode">
            {/* Lowercase mode is just a class we might use if body style isn't enough, but body style is set in index.css */}

            {/* Navigation */}
            <Navigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="flex-shrink-0"
            />

            {/* Content Area */}
            <main className="flex-1 overflow-hidden relative bg-background/50">
                {activeTab === 'databases' && <DatabasesPage />}

                {activeTab === 'home' && <HomePage />}

                {activeTab === 'headmates' && <HeadmatesPage />}
            </main>
        </div>
    );
}
