import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { debounce } from 'lodash';

export interface CanvasLayoutItem {
    id: string; // matches row ID
    x: number;
    y: number;
    width?: number;
    height?: number;
    scale?: number;
    connections?: any[];
}

export interface CanvasLayoutData {
    items: { [key: string]: CanvasLayoutItem };
    updated_at: string;
}

export function useCanvasLayout(tableName: string) {
    const { isAuthenticated } = useAuth();
    const [layout, setLayout] = useState<CanvasLayoutData>({ items: {}, updated_at: new Date().toISOString() });
    const [isLoading, setIsLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Fetch Layout
    useEffect(() => {
        if (!tableName || !isAuthenticated) return;

        const fetchLayout = async () => {
            setIsLoading(true);
            try {
                // Determine layout ID based on tableName
                // We store layouts in a 'canvas_layouts' table
                // Schema: id, name (unique), layout_data (json)

                const res = await apiClient.get('/canvas_layouts', {
                    params: {
                        filter: {
                            name: tableName
                        },
                        appends: []
                    }
                });

                const data = res.data?.data?.[0];
                if (data && data.layout_data) {
                    setLayout({
                        items: data.layout_data.items || {},
                        updated_at: data.updatedAt
                    });
                } else {
                    setLayout({ items: {}, updated_at: new Date().toISOString() });
                }
            } catch (err) {
                console.error("Failed to load layout:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLayout();
    }, [tableName, isAuthenticated]);

    // Save Layout (Debounced)
    const saveLayout = useCallback(async (currentLayoutMs: CanvasLayoutData) => {
        if (!tableName) return;

        try {
            // Check if exists first
            const res = await apiClient.get('/canvas_layouts', {
                params: {
                    filter: { name: tableName }
                }
            });

            const existing = res.data?.data?.[0];

            if (existing) {
                await apiClient.put(`/canvas_layouts/${existing.id}`, {
                    layout_data: currentLayoutMs
                });
            } else {
                await apiClient.post('/canvas_layouts', {
                    name: tableName,
                    layout_data: currentLayoutMs
                });
            }
            setHasUnsavedChanges(false);
            console.log("Layout saved for", tableName);
        } catch (err) {
            console.error("Failed to save layout:", err);
        }
    }, [tableName]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSave = useCallback(debounce(saveLayout, 2000), [saveLayout]);

    const updateLayoutItem = (id: string, updates: Partial<CanvasLayoutItem>) => {
        setLayout(prev => {
            const newItem = { ...(prev.items[id] || { id, x: 0, y: 0 }), ...updates };
            const next = {
                ...prev,
                items: {
                    ...prev.items,
                    [id]: newItem
                },
                updated_at: new Date().toISOString()
            };

            setHasUnsavedChanges(true);
            debouncedSave(next);
            return next;
        });
    };

    return {
        layout,
        isLoading,
        updateLayoutItem,
        hasUnsavedChanges
    };
}
