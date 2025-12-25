
import { useState } from 'react';
import { Database, Home, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GlobalSearchDialog } from '@/components/global-search-dialog';
// The user didn't explicitly ask for a router library, but "Navigation" implies it.
// Plan said "Modifying pages/dashboard.tsx -> pages/root-layout.tsx".
// Let's use simple state callbacks for now to keep it lightweight as requested ("simple").

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates';
    onTabChange: (tab: 'databases' | 'home' | 'headmates') => void;
    className?: string;
}

export function Navigation({ activeTab, onTabChange, className }: NavigationProps) {
    const [searchOpen, setSearchOpen] = useState(false);

    const tabs = [
        { id: 'databases', icon: Database, label: 'Databases' },
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'headmates', icon: Users, label: 'Headmates' },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <div className={cn("hidden md:flex flex-col w-16 border-r bg-card/30 backdrop-blur-sm items-center py-4 gap-4", className)}>
                <div className="flex flex-col gap-2">
                    <Button
                        variant={activeTab === 'databases' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-xl w-10 h-10"
                        onClick={() => onTabChange('databases')}
                        title="Databases"
                    >
                        <Database className="h-5 w-5" />
                        <span className="sr-only">Databases</span>
                    </Button>

                    <Button
                        variant={activeTab === 'home' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-xl w-10 h-10"
                        onClick={() => onTabChange('home')}
                        title="Home"
                    >
                        <Home className="h-5 w-5" />
                        <span className="sr-only">Home</span>
                    </Button>

                    <Button
                        variant={activeTab === 'headmates' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-xl w-10 h-10"
                        onClick={() => onTabChange('headmates')}
                        title="Headmates"
                    >
                        <Users className="h-5 w-5" />
                        <span className="sr-only">Headmates</span>
                    </Button>
                </div>

                <div className="mt-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl w-10 h-10"
                        onClick={() => setSearchOpen(true)}
                        title="Search / Ask AI"
                    >
                        <Search className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>

                <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            </div>

            {/* Mobile Top Bar (Top) */}
            <nav className={cn("md:hidden flex items-center justify-around px-4 h-16 border-t bg-background sticky bottom-0 z-50", className)}>
                {/* Order: Databases (Left), Home (Middle), Headmates (Right) is requested */}
                {/* Default map order is Databases, Home, Headmates. Perfect. */}
                {tabs.map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("rounded-xl h-10 w-10", activeTab === tab.id && "bg-primary text-primary-foreground")}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <tab.icon className="h-5 w-5" />
                    </Button>
                ))}
            </nav>
        </>
    );
}
