import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navigation } from '@/components/navigation';
import { BrowserRouter } from 'react-router-dom';

describe('Navigation', () => {
    it('dispatches pkm:open-search event when search button is clicked', () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        // Mock required props
        const props = {
            activeTab: 'home',
            onTabChange: vi.fn(),
            onSelectCollection: vi.fn(),
            selectedCollection: null,
            items: [],
            setItems: vi.fn(),
            onOpenSettings: vi.fn(),
        } as const;

        render(
            <BrowserRouter>
                <Navigation {...props} />
            </BrowserRouter>
        );

        const searchButton = screen.getByText('search / ask ai...');
        fireEvent.click(searchButton);

        expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
        const event = dispatchEventSpy.mock.calls.find(call => call[0].type === 'pkm:open-search')?.[0] as CustomEvent;
        expect(event).toBeDefined();
        expect(event.type).toBe('pkm:open-search');
    });
});
