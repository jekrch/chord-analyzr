import { useEffect } from 'react';

// The page itself never scrolls; content scrolls inside elements tagged with
// data-scroll-root (App's main container, the full-screen song sheet). While
// any overlay holds a lock, wheel and touch scrolling aimed at those is
// cancelled so the page underneath can't be dragged around. Overlays are
// portaled outside the scroll roots, so their own scrolling is untouched.
// Nothing is restyled: toggling overflow would drop the scrollbar and
// shift the layout. Counted, so stacked overlays release only when the
// last one closes.
let lockCount = 0;

function blockBackgroundScroll(e: Event) {
    if (e.target instanceof Element && e.target.closest('[data-scroll-root]')) {
        e.preventDefault();
    }
}

function lock() {
    if (lockCount++ > 0) return;
    document.addEventListener('wheel', blockBackgroundScroll, { passive: false });
    document.addEventListener('touchmove', blockBackgroundScroll, { passive: false });
}

function unlock() {
    if (--lockCount > 0) return;
    document.removeEventListener('wheel', blockBackgroundScroll);
    document.removeEventListener('touchmove', blockBackgroundScroll);
}

export function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        lock();
        return unlock;
    }, [active]);
}
