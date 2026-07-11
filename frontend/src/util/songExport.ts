/**
 * Song sheet export helpers: plain text (aligned chords-over-lyrics), PNG
 * image of the rendered sheet, and PDF via the browser's print dialog (the
 * print stylesheet in songSheetPrint.css isolates the sheet).
 */

import { toPng } from 'html-to-image';
import { ParsedSong, songToText } from './SongSheetParser';

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

export async function exportSongImage(node: HTMLElement, title: string): Promise<void> {
    // Black-on-white for printing (see songSheetPrint.css), sized to the full
    // content so clipped overflow and scrollbars never show up in the image.
    node.classList.add('song-sheet-exporting');
    try {
        const width = node.scrollWidth;
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
        node.classList.remove('song-sheet-exporting');
    }
}

export function exportSongPdf(): void {
    window.print();
}
