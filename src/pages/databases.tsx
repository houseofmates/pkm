
import { useCollections } from '@/hooks/use-collections';
import { CollectionCard } from '@/components/collection-card';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDialog } from '@/components/collection-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DatabaseContextMenu } from '@/components/database-context-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface DatabasesPageProps {
    onSelect?: (name: string) => void;
}

export function DatabasesPage({ onSelect }: DatabasesPageProps) {
    const { isAuthenticated, login } = useAuth();
    const { collections, loading, error, refresh } = useCollections();
    const [apiKey, setApiKey] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const allowed = (location.state as any)?.fromSidebar || localStorage.getItem('pkm:allow_databases_direct') || params.get('bookmark') === 'true';
        if (!allowed) {
            navigate('/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, navigate]);

    const handleSelect = (name: string) => {
        // Prefer prop if available (for flexibility), else direct route
        if (onSelect) {
            onSelect(name);
        } else {
            navigate(`/databases/${name}`, { state: { fromSidebar: true, view: 'table' } });
        }
    };

    const handleBookmark = () => {
        const url = window.location.origin + '/databases?bookmark=true';
        try {
            navigator.clipboard.writeText(url);
            localStorage.setItem('pkm:allow_databases_direct', '1');
            toast.success('Database link copied to clipboard');
        } catch (e) {
            console.warn('Clipboard write failed', e);
            toast.success('Copy URL: ' + url);
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
                        <CardTitle>connect nocobase</CardTitle>
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
                            <p className="text-xs text-muted-foreground">
                                <strong>Note:</strong> Dev servers use the full origin (host + port). If you started the dev server on a different port, you'll need to re-enter your API token for this origin.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleLogin}>connect</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-destructive">error loading databases: {error}</div>;
    }

    if (loading && collections.length === 0) {
        return <div className="p-8 text-muted-foreground">loading databases...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">databases</h1>
                <div className="flex items-center gap-2">
                    <CollectionDialog onSuccess={refresh} trigger={
                        <Button size="icon" variant="outline" className="rounded-full w-10 h-10">
                            <Plus className="h-6 w-6" />
                        </Button>
                    } />
                    <Button variant="ghost" size="sm" onClick={handleBookmark}>bookmark</Button>
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
                        <div key={collection.name} onClick={() => handleSelect(collection.name)} className="cursor-pointer group relative">
                            <DatabaseContextMenu collection={collection} onUpdate={refresh}>
                                <div className="pointer-events-none">
                                    {/* Disable pointer events on card ensuring the parent div click always fires */}
                                    <CollectionCard collection={collection} />
                                </div>
                            </DatabaseContextMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
