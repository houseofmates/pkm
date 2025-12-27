
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { NocoBaseClient } from '@/api/nocobase-client';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    client: NocoBaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('nocobase_token'));

    // Initialize client with a function to get the current token
    // This ensures the client always uses the latest token from the closure/state if we adjusted the client implementation,
    // but here we are passing a fresh client or using the ref pattern.
    // Actually, simplest is to re-create client or pass a token getter.
    // The client implementation I wrote takes `getToken` callback.
    const [client] = useState(() => new NocoBaseClient(() => localStorage.getItem('nocobase_token')));

    useEffect(() => {
        if (token) {
            localStorage.setItem('nocobase_token', token);
        } else {
            localStorage.removeItem('nocobase_token');
        }
    }, [token]);

    // Listen for 401s from api-client
    useEffect(() => {
        const handleAuthError = () => {
            setToken(null);
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, []);

    // Sync changes to localStorage is handled in login/logout to avoid race conditions with API clients
    const login = (newToken: string) => {
        localStorage.setItem('nocobase_token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('nocobase_token');
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, client }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
