
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface HeadmateOverride {
    color?: string;
    textColor?: string;
    avatarUrl?: string; // Custom image override
    description?: string; // Custom description override
}

interface FronterContextType {
    activeFronterId: string | null;
    setFronter: (id: string | null) => void;
    overrides: Record<string, HeadmateOverride>;
    updateOverride: (id: string, data: Partial<HeadmateOverride>) => void;
}

const FronterContext = createContext<FronterContextType | undefined>(undefined);

export function FronterProvider({ children }: { children: ReactNode }) {
    const [activeFronterId, setActiveFronterId] = useState<string | null>(() => {
        return localStorage.getItem('pkm_active_fronter');
    });

    const [overrides, setOverrides] = useState<Record<string, HeadmateOverride>>(() => {
        const stored = localStorage.getItem('pkm_headmate_overrides');
        return stored ? JSON.parse(stored) : {};
    });

    useEffect(() => {
        if (activeFronterId) {
            localStorage.setItem('pkm_active_fronter', activeFronterId);
        } else {
            localStorage.removeItem('pkm_active_fronter');
        }
    }, [activeFronterId]);

    useEffect(() => {
        localStorage.setItem('pkm_headmate_overrides', JSON.stringify(overrides));
    }, [overrides]);

    const updateOverride = (id: string, data: Partial<HeadmateOverride>) => {
        setOverrides(prev => ({
            ...prev,
            [id]: { ...prev[id], ...data }
        }));
    };

    return (
        <FronterContext.Provider value={{ activeFronterId, setFronter: setActiveFronterId, overrides, updateOverride }}>
            {children}
        </FronterContext.Provider>
    );
}

export function useFronter() {
    const context = useContext(FronterContext);
    if (context === undefined) {
        throw new Error('useFronter must be used within a FronterProvider');
    }
    return context;
}
