import { useEffect, useState } from 'react';

export const EXIT_TRANSITION_MS = 200;

/**
 * Keeps an overlay mounted while its close animation plays.
 * Render nothing when `isRendered` is false; use `isClosing` to swap the
 * enter animation class for the exit one.
 */
export function useExitTransition(isOpen: boolean, durationMs = EXIT_TRANSITION_MS) {
    const [isRendered, setIsRendered] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    // Adjust during render (not in an effect) so the first open frame
    // already has the overlay mounted
    if (isOpen && (!isRendered || isClosing)) {
        setIsRendered(true);
        setIsClosing(false);
    } else if (!isOpen && isRendered && !isClosing) {
        setIsClosing(true);
    }

    useEffect(() => {
        if (!isClosing) return;
        const timer = window.setTimeout(() => {
            setIsRendered(false);
            setIsClosing(false);
        }, durationMs);
        return () => window.clearTimeout(timer);
    }, [isClosing, durationMs]);

    return { isRendered, isClosing };
}
