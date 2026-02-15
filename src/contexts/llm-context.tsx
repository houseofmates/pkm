import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { useAuth } from '@/contexts/auth-context';
import type { LLMContextPayload, IdentityContext, AffectiveContext, ActivityContext } from '@/types/llm-context';
// import { useCollections } from '@/hooks/use-collections';
import { debounce } from 'lodash';
import { formatHeadmateName } from '@/utils/text-formatting';

const LLMContext = createContext<LLMContextPayload | null>(null);

export function LLMContextProvider({ children }: { children: React.ReactNode }) {
    const { activeFronters, overrides } = useFronter();
    const { client, isAuthenticated } = useAuth();
    // const { collections } = useCollections(); // Not used currently

    // Local state for aggregated context
    const [context, setContext] = useState<LLMContextPayload | null>(null);

    // Ref to track last pushed context to avoid spamming the main process
    const lastPushedRef = useRef<string | null>(null);

    // --- 1. Identity Context ---
    const getIdentityContext = (): IdentityContext => {
        // In a real app, we might fetch the full member details from a cache or NocoBase
        // For now, we use the active ID and any local overrides
        if (!activeFronters || activeFronters.length === 0) return { activeFronter: null };

        const primaryId = activeFronters[0];
        const override = overrides[primaryId] || {};

        // We'd ideally want the name. If we only have ID, we might need to look it up in a "members" list if we have it active.
        // For now, let's assume we can get it or fallback to ID.
        // If the FronterContext exposed the full list, that would be better. 
        // If the FronterContext exposed the full list, that would be better.
        // We do have access to SimplyPlural data in HeadmatesPage, but maybe not globally.
        // Let's try to get it from a local cache if possible, or just expose ID for now.
        // Actually, HeadmateCard uses proper names.
        // We will expose what we have.

        return {
            activeFronter: {
                id: primaryId,
                name: formatHeadmateName((override as any).name || primaryId), // Fallback
                avatarUrl: override.avatarUrl
            },
            systemName: "System" // Placeholder
        };
    };

    // --- 0. Collection Availability Check ---
    const [availableCollections, setAvailableCollections] = useState<string[]>([]);

    useEffect(() => {
        if (!isAuthenticated) return;
        client.listCollections({ pageSize: 100 }).then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
            if (Array.isArray(list)) {
                setAvailableCollections(list.map((c: any) => c.name));
            }
        }).catch(() => { });
    }, [client, isAuthenticated]);

    // --- 2. Affective Context ---
    const [moodState, setMoodState] = useState<AffectiveContext['currentMood']>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!availableCollections.includes('moods')) return;

        // Strategy: Look for a 'moods' or 'journal' collection
        const checkMood = async () => {
            // Try 'moods' collection first
            try {
                const res = await client.listRecords('moods', { pageSize: 1, sort: ['-createdAt'] });
                const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
                if (data && data.length > 0) {
                    const last = data[0];
                    setMoodState({
                        name: last.mood || last.name || last.state || 'Unknown',
                        intensity: last.intensity,
                        note: last.note || last.description
                    });
                    return;
                }
            } catch (e) { /* ignore */ }

            // Fallback: Check for 'pkm_settings' -> 'current_mood'
            // (We could implement this if 'moods' fails)
        };

        checkMood();
        // Poll every minute? Or just on mount/change.
        const interval = setInterval(checkMood, 60000);
        return () => clearInterval(interval);
    }, [client, isAuthenticated, availableCollections]);

    // --- 3. Activity Context ---
    const [recentActivity, setRecentActivity] = useState<ActivityContext['recentActions']>([]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!availableCollections.includes('journal')) return;

        const checkActivity = async () => {
            // Check 'journal' or just generic audit logs?
            // Let's look for 'journal'
            try {
                const res = await client.listRecords('journal', { pageSize: 3, sort: ['-createdAt'] });
                const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
                if (data && data.length > 0) {
                    setRecentActivity(data.map((item: any) => ({
                        type: 'journal_entry',
                        summary: item.title || item.content?.substring(0, 50) || 'Entry',
                        timestamp: item.createdAt || new Date().toISOString()
                    })));
                }
            } catch (e) { /* ignore */ }
        };
        checkActivity();
        const interval = setInterval(checkActivity, 60000);
        return () => clearInterval(interval);
    }, [client, isAuthenticated, availableCollections]);


    // --- Aggregation & Push ---

    // Debounced Push function
    const pushContext = useRef(debounce((payload: LLMContextPayload) => {
        const str = JSON.stringify(payload);
        if (str !== lastPushedRef.current) {
            console.log("Pushing LLM Context to Electron:", payload);
            if (window.electron && window.electron.updateContext) {
                window.electron.updateContext(payload);
            }
            lastPushedRef.current = str;
        }
    }, 1000)).current;

    useEffect(() => {
        const payload: LLMContextPayload = {
            identity: getIdentityContext(),
            affective: { currentMood: moodState },
            activity: { recentActions: recentActivity },
            timestamp: new Date().toISOString(),
            generatedAt: new Date().toISOString()
        };

        setContext(payload);
        pushContext(payload);
    }, [activeFronters, overrides, moodState, recentActivity]);

    return (
        <LLMContext.Provider value={context}>
            {children}
        </LLMContext.Provider>
    );
}

export function useLLMContext() {
    return useContext(LLMContext);
}
