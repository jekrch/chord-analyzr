import { useEffect } from 'react';

// The page itself never scrolls; content scrolls inside elements tagged with
// data-scroll-root (App's main container, the full-screen song sheet). While
// any overlay holds a lock, those and the body get overflow: hidden so the
// page underneath can't be dragged around (iOS otherwise scrolls it through
// the overlay). Counted, so stacked overlays release only when the last
// one closes.
let lockCount = 0;
const saved = new Map<HTMLElement, string>();

function lock() {
    if (lockCount++ > 0) return;
    const targets = [document.body, ...document.querySelectorAll<HTMLElement>('[data-scroll-root]')];
    for (const el of targets) {
        saved.set(el, el.style.overflow);
        el.style.overflow = 'hidden';
    }
}

function unlock() {
    if (--lockCount > 0) return;
    saved.forEach((overflow, el) => {
        el.style.overflow = overflow;
    });
    saved.clear();
}

export function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        lock();
        return unlock;
    }, [active]);
}
