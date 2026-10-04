import { useEffect, useState } from 'react';

// Long enough for the last staggered pad to finish its arrive animation
const ARRIVE_WINDOW_MS = 1200;

const EMPTY = new Map<number, number>();

/**
 * Tracks chords just appended to the list: a map of index -> position within
 * the batch that added it (0 for a single add), for staggering.
 * Only a true append counts (earlier entries unchanged), so replacing,
 * reordering, or transposing the sequence doesn't animate. Clears itself
 * shortly after, so remounting the pads later (mode switches) doesn't replay.
 */
export function useArrivingChords<T>(chords: T[]): Map<number, number> {
    const [prevChords, setPrevChords] = useState(chords);
    const [arriving, setArriving] = useState(EMPTY);

    // Adjust during render so the new pads mount with the class already set
    if (chords !== prevChords) {
        const isAppend = chords.length > prevChords.length
            && prevChords.every((chord, i) => chords[i] === chord);
        setPrevChords(chords);
        if (isAppend) {
            // Keep entries from a quick earlier add so those pads finish animating
            const next = new Map(arriving);
            for (let i = prevChords.length; i < chords.length; i++) {
                next.set(i, i - prevChords.length);
            }
            setArriving(next);
        } else if (arriving.size) {
            setArriving(EMPTY);
        }
    }

    useEffect(() => {
        if (!arriving.size) return;
        const timer = window.setTimeout(() => setArriving(EMPTY), ARRIVE_WINDOW_MS);
        return () => window.clearTimeout(timer);
    }, [arriving]);

    return arriving;
}
