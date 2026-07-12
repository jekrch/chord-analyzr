/**
 * Sheet chord collision layout.
 * Chord labels in the rendered sheet hang above the lyric text, absolutely
 * positioned at their chord's exact character column. The editor is
 * monospace, so chords a few columns apart always look separated there — but
 * the sheet's lyric font is proportional, and the labels take no space in
 * the text flow, so the same columns can land close enough for the labels to
 * render on top of each other. This pass measures each line's labels and
 * pushes any label just clear of the previous one on the same visual row.
 * Only the labels move: the anchors and the lyric text keep their exact
 * columns, so a nudge is display-only and never changes the source.
 */

/** Clear space kept between neighboring labels, as a fraction of the label's
 * line height (roughly half a character of the monospace chord font). */
const GAP_RATIO = 0.4;

export function layoutSheetChords(root: HTMLElement): void {
    // The live print preview scales the sheet with a transform: client rects
    // then come back in visual px while style.left applies in local px, so
    // nudges must be divided back by the effective scale. offsetWidth is the
    // untransformed layout width, so the ratio recovers the scale (1 when
    // the sheet is unscaled; the measurements below stay self-consistent
    // either way).
    const scale = root.getBoundingClientRect().width / root.offsetWidth || 1;
    for (const lineEl of Array.from(root.querySelectorAll<HTMLElement>('[data-lyric-line]'))) {
        const labels: HTMLElement[] = [];
        for (const anchor of Array.from(lineEl.querySelectorAll<HTMLElement>('[data-chord-anchor]'))) {
            const label = anchor.firstElementChild;
            if (label instanceof HTMLElement) {
                label.style.left = ''; // back to its true column before measuring
                labels.push(label);
            }
        }
        if (labels.length < 2) continue;

        // Anchors come in column order, so labels on one visual row have
        // ascending lefts; a wrapped line starts a fresh row (new top).
        let prevRight = -Infinity;
        let prevTop = -Infinity;
        for (const label of labels) {
            const button = label.firstElementChild instanceof HTMLElement ? label.firstElementChild : label;
            const rect = button.getBoundingClientRect();
            const sameRow = Math.abs(rect.top - prevTop) < rect.height / 2;
            const minLeft = prevRight + rect.height * GAP_RATIO;
            if (sameRow && rect.left < minLeft) {
                label.style.left = `${(minLeft - rect.left) / scale}px`;
                prevRight = minLeft + rect.width;
            } else {
                prevRight = rect.right;
            }
            prevTop = rect.top;
        }
    }
}
