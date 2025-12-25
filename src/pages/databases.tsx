
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/components/collection-card';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCollectionDialog } from '@/components/create-collection-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';
import { DatabaseContextMenu } from '@/components/database-context-menu';

// No longer importing CollectionDetailPage here directly, it's handled by RootLayout
// But we can accept an onSelect prop to bubble up selection

import { useOutletContext } from 'react-router-dom'; // If we were using router...
// But we are using props in RootLayout. 
// We generally can't easily pass props to a simplified routing if we aren't careful.
// Wait, RootLayout renders <DatabasesPage /> directly. We can pass props.

interface DatabasesPageProps {
    onSelect?: (name: string) => void;
}

export function DatabasesPage({ onSelect }: DatabasesPageProps) {
    const { isAuthenticated, login } = useAuth();
    const { collections, loading, error, refresh } = useCollections();
    const [apiKey, setApiKey] = useState('');

    // Fallback if no prop provided (shouldn't happen with updated RootLayout)
    const handleSelect = (name: string) => {
        if (onSelect) {
            onSelect(name);
        } else {
            console.warn("No onSelect handler provided to DatabasesPage");
        }
    };

    const handleLogin = () => {
        if (!apiKey) return;
        login(apiKey);
        toast.success("NocoBase API Key saved");
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Connect NocoBase</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Token</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter NocoBase API Token"
                            />
                            <p className="text-xs text-muted-foreground">
                                Your token is stored locally.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleLogin}>Connect</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-destructive">Error loading databases: {error}</div>;
    }

    if (loading && collections.length === 0) {
        return <div className="p-8 text-muted-foreground">loading databases...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">Databases</h1>
                <div className="flex items-center gap-2">
                    <CreateCollectionDialog onCollectionCreated={refresh} />
                </div>
            </div>
            {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 border-2 border-dashed rounded-lg opacity-50">
                    <p className="text-xl">no databases found</p>
                    <p className="text-sm">create one to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {collections.map(collection => (
                        <div key={collection.name} onClick={() => handleSelect(collection.name)} className="cursor-pointer">
                            <DatabaseContextMenu collection={collection} onUpdate={refresh}>
                                <CollectionCard collection={collection} />
                            </DatabaseContextMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
