
import { Navigation } from '@/components/navigation';
// import { DatabasesPage } from '@/pages/databases';
// import { HomePage } from '@/pages/home';
// import { HeadmatesPage } from '@/pages/headmates';
// import { CollectionDetailPage } from '@/pages/collection-detail';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';

export function RootLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // Derived state for Navigation component
    const activeTab = location.pathname.startsWith('/headmates') ? 'headmates'
        : location.pathname.startsWith('/databases') ? 'databases'
            : 'home';

    // Parse collection name from URL if present (e.g. /databases/my-collection)
    const pathParts = location.pathname.split('/');
    const selectedCollection = activeTab === 'databases' && pathParts.length > 2 ? pathParts[2] : null;

    const handleTabChange = (tab: 'databases' | 'home' | 'headmates') => {
        if (tab === 'home') navigate('/');
        else if (tab === 'headmates') navigate('/headmates');
        else navigate('/databases');
    };

    const handleSelectCollection = (name: string | null) => {
        if (name) navigate(`/databases/${name}`);
        else navigate('/databases');
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background text-foreground font-sans lowercase-mode">

            {/* Navigation */}
            <Navigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
                selectedCollection={selectedCollection}
                onSelectCollection={handleSelectCollection}
                className="flex-shrink-0"
            />

            {/* Content Area */}
            <main className="flex-1 overflow-auto relative bg-background/50 pb-16 md:pb-0">
                <div className="p-10 text-blue-500 font-bold">
                    NAVIGATION IMPORT RESTORED.
                    <br />
                    If you see the sidebar + this text, Navigation is safe.
                </div>
                {/* <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/headmates" element={<HeadmatesPage />} />
                    <Route path="/databases" element={<DatabasesPage onSelect={handleSelectCollection} />} />
                    <Route path="/databases/:name" element={<CollectionWrapper />} />
                </Routes> */}
            </main>
        </div>
    );
}

// Wrapper to extract params for CollectionDetailPage
// function CollectionWrapper() {
//     const { name } = useParams<{ name: string }>();
//     const navigate = useNavigate();
//     return <CollectionDetailPage collectionName={name!} onBack={() => navigate('/databases')} />;
// }
