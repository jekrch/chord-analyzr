import { useCallback, useEffect, useState } from 'react';

export type AppRoute = 'main' | 'songs';

function getRoute(): AppRoute {
    return /^#\/?songs/.test(window.location.hash) ? 'songs' : 'main';
}

/**
 * Minimal hash-based routing ('#/songs' <-> main view). Hash routing keeps
 * the app deployable as static files and leaves the search-param state
 * serialization (?s=) untouched.
 *
 * Plain state + a hashchange listener rather than useSyncExternalStore: App
 * sets state during render when the route changes, and in React 18 that
 * leaves useSyncExternalStore comparing against the route from first load,
 * so navigating back to that route was silently ignored.
 */
export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
    const [route, setRoute] = useState(getRoute);
    useEffect(() => {
        const sync = () => setRoute(getRoute());
        // Catch a change between the first render and subscribing
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);
    const navigate = useCallback((target: AppRoute) => {
        window.location.hash = target === 'songs' ? '/songs' : '';
    }, []);
    return [route, navigate];
}
