
import { Database, Home, Users } from 'lucide-react';

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates';
    onTabChange: (tab: 'databases' | 'home' | 'headmates') => void;
    className?: string;
    onSelectCollection: (name: string | null) => void;
    selectedCollection: string | null;
}

export function Navigation({ activeTab, onTabChange, className }: NavigationProps) {
    return (
        <div className="w-64 border-r bg-card p-4">
            <h2 className="font-bold text-lg mb-4">Navigation Safe Mode</h2>
            <div className="flex flex-col gap-2">
                <button onClick={() => onTabChange('home')}>Home</button>
                <button onClick={() => onTabChange('headmates')}>Headmates</button>
                <button onClick={() => onTabChange('databases')}>Databases</button>
            </div>
        </div>
    );
}
