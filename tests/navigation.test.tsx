import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navigation } from '@/components/navigation';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';

// mock useCollections to avoid API calls
vi.mock('@/hooks/use-collections', () => ({
  useCollections: () => ({ collections: [], refresh: () => {} }),
}));

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

        // make sure body text exists so navigation's search code can slice it
        document.body.innerText = 'dummy';

        render(
            <BrowserRouter>
                <Navigation {...props} />
            </BrowserRouter>
        );

        const searchButton = screen.getByText('search / ask ai...');
        fireEvent.click(searchButton);

        // locate any dispatched event of the expected type
        const event = dispatchEventSpy.mock.calls
          .map(call => call[0])
          .find((ev: any) => ev && ev.type === 'pkm:open-search');
        expect(event).toBeDefined();
    });
});
