import { useCallback, useSyncExternalStore } from 'react';

export type AppRoute = 'main' | 'songs';

function getRoute(): AppRoute {
    return /^#\/?songs/.test(window.location.hash) ? 'songs' : 'main';
}

function subscribe(callback: () => void) {
    window.addEventListener('hashchange', callback);
    return () => window.removeEventListener('hashchange', callback);
}

/**
 * Minimal hash-based routing ('#/songs' <-> main view). Hash routing keeps
 * the app deployable as static files and leaves the search-param state
 * serialization (?s=) untouched.
 */
export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
    const route = useSyncExternalStore(subscribe, getRoute);
    const navigate = useCallback((target: AppRoute) => {
        window.location.hash = target === 'songs' ? '/songs' : '';
    }, []);
    return [route, navigate];
}
