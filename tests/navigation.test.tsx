import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navigation } from '@/components/navigation';
import { BrowserRouter, MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';

// mock useCollections to avoid API calls
const collectionsMock: { collections: any[]; refresh: () => void } = { collections: [], refresh: () => {} };
vi.mock('@/hooks/use-collections', () => ({
  useCollections: () => collectionsMock,
}));

describe('Navigation', () => {
    // reuse props for both tests
    const props = {
        activeTab: 'home' as const,
        onTabChange: vi.fn(),
        onSelectCollection: vi.fn(),
        selectedCollection: null,
        items: [],
        setItems: vi.fn(),
    };

    it('dispatches pkm:open-search event when search button is clicked', () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

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

    it('navigates to /settings when settings icon is clicked', () => {
        // render with memory router to inspect location
        function LocationDisplay() {
            const loc = useLocation();
            return <div data-testid="loc">{loc.pathname}</div>;
        }

        // reuse props from earlier test
        const props2 = { ...props };
        render(
            <MemoryRouter initialEntries={['/']}>
                <Navigation {...props2} />
                <Routes>
                    <Route path="/settings" element={<div>settings page</div>} />
                </Routes>
                <LocationDisplay />
            </MemoryRouter>
        );

        const button = screen.getByTitle('settings');
        fireEvent.click(button);
        expect(screen.getByTestId('loc')).toHaveTextContent('/settings');
    });

    it('renders without crashing when setItems prop is omitted (mobile drawer case)', () => {
        render(
            <BrowserRouter>
                <Navigation
                    activeTab="home"
                    onTabChange={() => {}}
                    onSelectCollection={() => {}}
                    selectedCollection={null}
                    items={[]}
                />
            </BrowserRouter>
        );
        // verify something from the UI is present
        expect(screen.getByTitle('search / ask ai...')).toBeTruthy();
    });

    it('cleans up stale collections when server list changes', async () => {
        // initial server has a collection named foo
        collectionsMock.collections = [{ name: 'foo', title: 'Foo' }];
        const setItemsSpy = vi.fn();
        render(
            <BrowserRouter>
                <Navigation
                    activeTab="home"
                    onTabChange={() => {}}
                    onSelectCollection={() => {}}
                    selectedCollection={null}
                    items={[{ id: 'foo', type: 'collection', name: 'Foo' }]}
                    setItems={setItemsSpy}
                />
            </BrowserRouter>
        );
        // allow effect to run
        await screen.findByText('search / ask ai...');
        // now simulate deletion on server
        collectionsMock.collections = [];
        // re-render with same props to trigger effect
        render(
            <BrowserRouter>
                <Navigation
                    activeTab="home"
                    onTabChange={() => {}}
                    onSelectCollection={() => {}}
                    selectedCollection={null}
                    items={[{ id: 'foo', type: 'collection', name: 'Foo' }]}
                    setItems={setItemsSpy}
                />
            </BrowserRouter>
        );
        // wait for syncAll to call setItems with filtered array
        await new Promise((r) => setTimeout(r, 50));
        expect(setItemsSpy).toHaveBeenCalled();
        const lastCall = setItemsSpy.mock.calls[setItemsSpy.mock.calls.length - 1][0];
        expect(lastCall).not.toEqual(expect.arrayContaining([{ id: 'foo', type: 'collection', name: 'Foo' }]));
    });
});
