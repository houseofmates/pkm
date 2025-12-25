
// import { Navigation } from '@/components/navigation';
// import { DatabasesPage } from '@/pages/databases';
// import { HomePage } from '@/pages/home';
// import { HeadmatesPage } from '@/pages/headmates';
// import { CollectionDetailPage } from '@/pages/collection-detail';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';

export function RootLayout() {
    return (
        <div className="p-10 text-4xl font-bold text-green-500">
            ROOT LAYOUT IS ALIVE.
            <br />
            <span className="text-xl text-foreground">If you see this, the crash is in one of the imports (Home, Databases, or Navigation).</span>
        </div>
    );
}
