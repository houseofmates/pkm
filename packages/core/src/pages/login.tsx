import React, { useState } from "react";
import { secureLogger } from "@/lib/secure-logger";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { isPublicDomain } from "@/utils/subdomain-router";
import { Database, Key } from "lucide-react";

export function LoginPage() {
  const { loginWithApiKey } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    setIsValidating(true);
    setError(null);
    try {
      await loginWithApiKey(apiKey);
    } catch (err: any) {
      secureLogger.error("login failed:", err);
      setError(
        err?.message || "login failed. please check your api key and try again.",
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
              <img
                src="/favicon.png"
                className="w-10 h-10 object-contain"
                alt="house of mates"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Database className="w-10 h-10 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center">
            login to {isPublic ? "house of mates" : "pkm"}
          </h1>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          enter your nocobase api key
        </p>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="api key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isValidating}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isValidating || !apiKey}
          >
            {isValidating ? "logging in..." : "login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
  };

  const isPublic = isPublicDomain();

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          {isPublic ? (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <img
                src="/favicon.png"
                className="w-10 h-10 object-contain"
                alt="house of mates"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Database className="w-10 h-10 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center">
            login to {isPublic ? "house of mates" : "pkm"}
          </h1>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          enter your pocketbase credentials
        </p>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isValidating}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isValidating}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isValidating || !email || !password}
          >
            {isValidating ? "logging in..." : "login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
