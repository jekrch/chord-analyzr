/**
 * Song sheet export helpers: plain text (aligned chords-over-lyrics), PNG
 * image of the rendered sheet, and PDF via the browser's print dialog (the
 * print stylesheet in songSheetPrint.css isolates the sheet).
 */

import { toPng } from 'html-to-image';
import { SheetExportSettings, useSongStore } from '../stores/songStore';
import { ParsedSong, songToText } from './SongSheetParser';
import { layoutSheetChords } from './sheetChordLayout';

/**
 * Make sure the rendered sheet is on screen, then hand its DOM node to
 * `action` — the export helpers all need `#song-sheet-print` laid out. The
 * short delay lets a switch out of edit view paint before we measure.
 */
export function withSheetPrintNode(action: (node: HTMLElement) => void): void {
    useSongStore.getState().setViewMode('sheet');
    setTimeout(() => {
        const node = document.getElementById('song-sheet-print');
        if (node) action(node);
    }, 150);
}

// Letter-size page at CSS resolution (96px/in); the PNG mimics the printed
// page's width so margins, font sizes and columns come out the same.
const PAGE_LONG_PX = 11 * 96;
const PAGE_SHORT_PX = 8.5 * 96;

export function pageWidthPx(orientation: SheetExportSettings['orientation']): number {
    return orientation === 'landscape' ? PAGE_LONG_PX : PAGE_SHORT_PX;
}

export function pageHeightPx(orientation: SheetExportSettings['orientation']): number {
    return orientation === 'landscape' ? PAGE_SHORT_PX : PAGE_LONG_PX;
}

/**
 * Recompute the chord-label collision nudges (see sheetChordLayout) as the
 * printed page needs them: the print rules change the page width, font sizes
 * and column count, so lines wrap differently and the on-screen nudges no
 * longer hold. The `.song-sheet-exporting` rules mirror the `@media print`
 * rules exactly, so measuring under that class at the page width yields the
 * print-accurate nudges; the class comes straight back off — only the inline
 * nudges remain, and those carry into the print rendering. All synchronous,
 * so nothing flashes on screen.
 */
export function layoutSheetChordsForPrint(node: HTMLElement, settings: SheetExportSettings): void {
    // While the live preview is open the sheet already wears the exporting
    // class (owned by React, see SongSheetView) — leave it on afterwards.
    const hadClass = node.classList.contains('song-sheet-exporting');
    node.classList.add('song-sheet-exporting');
    const prevWidth = node.style.width;
    node.style.width = `${pageWidthPx(settings.orientation)}px`;
    try {
        layoutSheetChords(node);
    } finally {
        node.style.width = prevWidth;
        if (!hadClass) node.classList.remove('song-sheet-exporting');
    }
}

export function downloadBlob(content: BlobPart, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function safeFilename(title: string): string {
    return (title.trim() || 'song').replace(/[^\w\s-]+/g, '').replace(/\s+/g, '-').toLowerCase();
}

export function exportSongText(parsed: ParsedSong, title: string): void {
    const header = title.trim() ? `${title.trim()}\n\n` : '';
    downloadBlob(header + songToText(parsed), `${safeFilename(title)}.txt`, 'text/plain');
}

export async function exportSongImage(
    node: HTMLElement,
    title: string,
    settings: SheetExportSettings
): Promise<void> {
    // Black-on-white for printing (see songSheetPrint.css), laid out at the
    // chosen page width and sized to the full content so clipped overflow
    // and scrollbars never show up in the image.
    const width = pageWidthPx(settings.orientation);
    const hadClass = node.classList.contains('song-sheet-exporting'); // live preview open
    node.classList.add('song-sheet-exporting');
    const prevWidth = node.style.width;
    node.style.width = `${width}px`;
    try {
        layoutSheetChords(node); // re-resolve chord collisions at the export layout
        const height = node.scrollHeight;
        const dataUrl = await toPng(node, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            width,
            height,
            style: { overflow: 'visible', width: `${width}px`, height: `${height}px` },
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeFilename(title)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } finally {
        node.style.width = prevWidth;
        if (!hadClass) node.classList.remove('song-sheet-exporting');
        layoutSheetChords(node); // back to the on-screen (or preview) nudges
    }
}

export function exportSongPdf(settings: SheetExportSettings): void {
    // @page can't read CSS variables, so orientation and margin are injected
    // as a one-off rule for the duration of the print dialog. Vertical
    // margins are real page margins so every page gets them; horizontal
    // space comes from the sheet's padding (see songSheetPrint.css).
    const style = document.createElement('style');
    style.textContent =
        `@page { size: ${settings.orientation}; margin: ${settings.margin}in 0; }`;
    document.head.appendChild(style);
    try {
        window.print();
    } finally {
        // window.print() blocks while the dialog is open in every major
        // browser, so the rule can come straight back out.
        style.remove();
    }
}
