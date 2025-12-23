
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export function LoginPage() {
    const { login } = useAuth();
    const [inputToken, setInputToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc2NjUzMTA5NiwiZXhwIjozMzMyNDEzMTA5Nn0.Icl0FBzaTa18jiar2Bo9KByD8dTwF5jGHDHmGPZ5o0o');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputToken) {
            login(inputToken);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-center">Login to PKM</h1>
                <p className="text-sm text-center text-muted-foreground">Enter your NocoBase JWT Token</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Paste JWT Token here..."
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                    />
                    <Button type="submit" className="w-full">
                        Login
                    </Button>
                </form>
            </div>
        </div>
    );
}
