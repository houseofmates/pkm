
import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { isPublicDomain } from '@/utils/subdomain-router';
import { Database } from 'lucide-react';
import { NocoBaseClient } from '@/api/nocobase-client';
import { normalizeAuthToken, toAuthorizationHeaderValue } from '@/lib/auth-token';

export function LoginPage() {
  const { login } = useAuth();
  const [inputToken, setInputToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // performs a quick sanity check against the backend before
  // actually storing the token. previously we unconditionally saved the
  // value and relied on the first API call to fail, which would dispatch
  // an `auth-error` event and drop the token. this caused a confusing
  // experience where users would paste a *bad* token and then immediately
  // be asked to paste it again even though nothing looked wrong. instead we
  // hit a lightweight endpoint and only resolve when the token appears to be
  // valid.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedToken = normalizeAuthToken(inputToken);
    if (!normalizedToken) return;

    setIsValidating(true);
    setError(null);
    try {
      // validate the token by making a simple collection list request. the
      // endpoint itself doesn't matter much, it just has to be protected by
      // nocobase so that an invalid/expired token returns 401/403.
      const client = new NocoBaseClient();
      // pass the token directly in headers so we don't rely on storage yet.
      await client.client.get('/collections:list', {
        headers: {
          Authorization: toAuthorizationHeaderValue(normalizedToken),
        },
        params: { pageSize: 1 },
      });

      // if validation succeeded, store it and let the rest of the app handle
      // any additional initialization (e.g. ensureBackendCollection).
      login(normalizedToken);
      // small delay to let state propagate
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err: any) {
      console.error('token validation failed:', err);
      setError(
        'token appears invalid or expired; please double-check and try again.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const isPublic = isPublicDomain();

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          {isPublic ? (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              {/* use the new transparent database icon as the login image */}
              <img src="/favicon.png" className="w-10 h-10 object-contain" alt="house of mates" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Database className="w-10 h-10 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center">login to {isPublic ? 'house of mates' : 'pkm'}</h1>
        </div>

        <p className="text-sm text-center text-muted-foreground">enter your nocobase jwt token</p>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}

        {inputToken.startsWith('ey') && (
          <div className="text-xs text-muted-foreground break-all">
            {(() => {
              try {
                const payload = JSON.parse(atob(inputToken.split('.')[1] || '{}'));
                if (payload.exp) {
                  const date = new Date(payload.exp * 1000);
                  const isExpired = date < new Date();
                  return (
                    <div className={`mt-2 p-2 rounded ${isExpired ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
                      <p><strong>token type:</strong> jwt</p>
                      <p><strong>expires:</strong> {date.toLocaleString()}</p>
                      {isExpired && <p className="font-bold text-red-600">⚠️ this token has expired!</p>}
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="paste jwt token here..."
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            disabled={isValidating}
          />

          <Button type="submit" className="w-full" disabled={isValidating || !inputToken}>
            {isValidating ? 'validating...' : 'login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
