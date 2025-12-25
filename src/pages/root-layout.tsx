
import { Outlet } from 'react-router-dom';

export function RootLayout() {
    return (
        <div className="p-10 text-4xl font-bold text-red-500">
            SAFE MODE: If you see this, Routing is working.
        </div>
    );
}
