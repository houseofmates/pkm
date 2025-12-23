
import { Database, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// The user didn't explicitly ask for a router library, but "Navigation" implies it.
// Plan said "Modifying pages/dashboard.tsx -> pages/root-layout.tsx".
// Let's use simple state callbacks for now to keep it lightweight as requested ("simple").

interface NavigationProps {
    activeTab: 'databases' | 'home' | 'headmates';
    onTabChange: (tab: 'databases' | 'home' | 'headmates') => void;
    className?: string;
}

export function Navigation({ activeTab, onTabChange, className }: NavigationProps) {
    const tabs = [
        { id: 'databases', icon: Database, label: 'Databases' },
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'headmates', icon: Users, label: 'Headmates' },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <nav className={cn("hidden md:flex flex-col items-center py-4 border-r w-64 bg-background", className)}>
                {/* Top Icons Row */}
                <div className="flex flex-row items-center justify-between w-full px-4 mb-4">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("rounded-xl h-10 w-10", activeTab === tab.id && "bg-primary text-primary-foreground")}
                            onClick={() => onTabChange(tab.id)}
                            title={tab.label}
                        >
                            <tab.icon className="h-5 w-5" />
                        </Button>
                    ))}
                </div>
                {/* Placeholder for future sidebar content if any, or just empty space */}
                <div className="flex-1 w-full"></div>
            </nav>

            {/* Mobile Top Bar (Top) */}
            <nav className={cn("md:hidden flex items-center justify-around px-4 h-16 border-b bg-background sticky top-0 z-50", className)}>
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
