
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAppSetting } from '@/hooks/use-app-setting';

export interface HeadmateOverride {
    color?: string;
    textColor?: string;
    avatarUrl?: string; // Custom image override
    description?: string; // Custom description override
    hidden?: boolean; // Soft delete/hide
}

interface FronterContextType {
    activeFronterId: string | null;
    setFronter: (id: string | null) => void;
    overrides: Record<string, HeadmateOverride>;
    updateOverride: (id: string, data: Partial<HeadmateOverride>) => void;
    flushOverrides: () => Promise<void>;
}

const FronterContext = createContext<FronterContextType | undefined>(undefined);

export function FronterProvider({ children }: { children: ReactNode }) {
    const [activeFronterId, setActiveFronterId] = useState<string | null>(() => {
        return localStorage.getItem('pkm_active_fronter');
    });

    const [overrides, setOverrides, , flushOverrides] = useAppSetting<Record<string, HeadmateOverride>>('pkm_headmate_overrides', {});

    useEffect(() => {
        if (activeFronterId) {
            localStorage.setItem('pkm_active_fronter', activeFronterId);
        } else {
            localStorage.removeItem('pkm_active_fronter');
        }
    }, [activeFronterId]);

    const updateOverride = (id: string, data: Partial<HeadmateOverride>) => {
        setOverrides(prev => ({
            ...prev,
            [id]: { ...prev[id], ...data }
        }));
    };

    return (
        <FronterContext.Provider value={{ activeFronterId, setFronter: setActiveFronterId, overrides, updateOverride, flushOverrides }}>
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