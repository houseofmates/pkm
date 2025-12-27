
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
                    params: { pageSize: '1' }
                });

                login(inputToken);
            } catch (err: any) {
                console.error("Token validation failed:", err);
                // Check if specific blocked error
                const msg = err?.data?.errors?.[0]?.message || err?.message || '';
                const code = err?.data?.errors?.[0]?.code || '';

                if (code === 'BLOCKED_TOKEN') {
                    setError("Token rejected by server (BLOCKED_TOKEN). This usually means it was explicitly revoked or you logged out.");
                } else {
                    setError(`Invalid token: ${msg || 'Unknown error'}`);
                }
            } finally {
                setIsValidating(false);
            }
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-center">login to pkm</h1>
                <p className="text-sm text-center text-muted-foreground">enter your nocobase jwt token</p>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                {inputToken.startsWith('ey') && (
                    <div className="text-xs text-muted-foreground break-all">
                        {(() => {
                            try {
                                const payload = JSON.parse(atob(inputToken.split('.')[1]));
                                if (payload.exp) {
                                    const date = new Date(payload.exp * 1000);
                                    const isExpired = date < new Date();
                                    return (
                                        <div className={`mt-2 p-2 rounded ${isExpired ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
                                            <p><strong>token type:</strong> jwt</p>
                                            <p><strong>Expires:</strong> {date.toLocaleString()}</p>
                                            {isExpired && <p className="font-bold text-red-600">⚠️ This token has expired!</p>}
                                        </div>
                                    );
                                }
                            } catch (e) {
                                return null;
                            }
                        })()}
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
