
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export function LoginPage() {
    const { login } = useAuth();
    const [inputToken, setInputToken] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputToken) {
            setIsValidating(true);
            setError(null);
            try {
                // Validate token before saving
                const { apiRequest } = await import('@/lib/api-client');
                await apiRequest('nocobase', '/collections:list', {
                    headers: { Authorization: `Bearer ${inputToken}` },
                    params: { pageSize: 1 }
                });

                login(inputToken);
            } catch (err) {
                console.error("Token validation failed:", err);
                setError("Invalid token. Please check and try again.");
            } finally {
                setIsValidating(false);
            }
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-center">Login to PKM</h1>
                <p className="text-sm text-center text-muted-foreground">Enter your NocoBase JWT Token</p>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Paste JWT Token here..."
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        disabled={isValidating}
                    />
                    <Button type="submit" className="w-full" disabled={isValidating || !inputToken}>
                        {isValidating ? 'Validating...' : 'Login'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
