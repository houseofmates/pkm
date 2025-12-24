
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

// In a real app we'd wrap this with DnD context (dnd-kit)
// For now, implementing the Visual Card Grid
export function DatabasesPage() {
    const { isAuthenticated, login, logout } = useAuth();
    const { collections, loading, error, refresh } = useCollections();
    const [apiKey, setApiKey] = useState('');

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
                        <CollectionCard key={collection.name} collection={collection} />
                    ))}
                </div>
            )}
        </div>
    );
}
