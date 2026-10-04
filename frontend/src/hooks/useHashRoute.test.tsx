import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState } from 'react';
import { useHashRoute } from './useHashRoute';

// Mirrors App: sets state during render whenever the route changes
const RouteView = () => {
    const [route] = useHashRoute();
    const [lastRoute, setLastRoute] = useState(route);
    if (route !== lastRoute) setLastRoute(route);
    return <div data-testid="route">{route}</div>;
};

const goTo = (hash: string) =>
    act(async () => {
        window.location.hash = hash;
        await new Promise(r => setTimeout(r, 0));
    });

describe('useHashRoute', () => {
    afterEach(() => {
        window.location.hash = '';
    });

    it('follows repeated main <-> songs switches', async () => {
        window.location.hash = '';
        const { getByTestId } = render(<RouteView />);
        expect(getByTestId('route').textContent).toBe('main');

        for (let i = 0; i < 2; i++) {
            await goTo('/songs');
            expect(getByTestId('route').textContent).toBe('songs');
            await goTo('');
            expect(getByTestId('route').textContent).toBe('main');
        }
    });
});
