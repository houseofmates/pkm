
import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { DatabasesPage } from '@/pages/databases';
import { HomePage } from '@/pages/home';
import { HeadmatesPage } from '@/pages/headmates';
import { CollectionDetailPage } from '@/pages/collection-detail'; // Import directly

export function RootLayout() {
    const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates'>('databases');
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background text-foreground font-sans lowercase-mode">

            {/* Navigation */}
            <Navigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                selectedCollection={selectedCollection}
                onSelectCollection={setSelectedCollection}
                className="flex-shrink-0"
            />

            {/* Content Area */}
            <main className="flex-1 overflow-auto relative bg-background/50 pb-16 md:pb-0">
                {activeTab === 'databases' && (
                    selectedCollection ? (
                        <CollectionDetailPage
                            collectionName={selectedCollection}
                            onBack={() => setSelectedCollection(null)}
                        />
                    ) : (
                        <DatabasesPage onSelect={setSelectedCollection} />
                    )
                )}

                {activeTab === 'home' && <HomePage />}

                {activeTab === 'headmates' && <HeadmatesPage />}
            </main>
        </div>
    );
}
