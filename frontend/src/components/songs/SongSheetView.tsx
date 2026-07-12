import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Song, playSheetChord, useSongStore } from '../../stores/songStore';
import {
    ParsedSong,
    SheetChord,
    SheetLine,
    insertChordAtColumn,
    moveChordToColumn,
    nextFreeColumn,
    removeChordFromSource,
    replaceChordInSource,
} from '../../util/SongSheetParser';
import { layoutSheetChords } from '../../util/sheetChordLayout';
import { layoutSheetChordsForPrint, pageHeightPx, pageWidthPx } from '../../util/songExport';
import ChordContextMenu from './ChordContextMenu';
import ChordPickerPopover from './ChordPickerPopover';

const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 5;
const UNDO_LIMIT = 50;

interface SongSheetViewProps {
    song: Song;
    parsed: ParsedSong;
    /** Inline-format source that `parsed`'s offsets refer to. */
    source: string;
    onSourceChange: (nextInlineSource: string) => void;
}

interface PickerTarget {
    anchorRect: DOMRect;
    /** Insert a new chord at this column on this line (extending it with
     * spaces first if past its current text; padding with a single
     * separating space before the marker if needed) ... */
    insert: { line: SheetLine; col: number; padBefore: boolean } | null;
    /** ...or edit this existing chord. */
    chord: SheetChord | null;
}

/** The DOM node/offset the browser would place a caret at for a client point. */
function caretPositionAtPoint(clientX: number, clientY: number): { node: Node; offset: number } | null {
    const doc = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(clientX, clientY);
        return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
    }
    if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(clientX, clientY);
        return range ? { node: range.startContainer, offset: range.startOffset } : null;
    }
    return null;
}

/**
 * Character column under a client point within a lyric line element. The
 * line's text is split into several nodes around the chord anchors, so the
 * column is the caret offset in the hit node plus all lyric text before it.
 * Returns Infinity for points right of the text (callers clamp to the end)
 * and null for points that belong to a chord's own click handlers.
 */
function lyricColAtPoint(container: HTMLElement, clientX: number, clientY: number): number | null {
    const hit = caretPositionAtPoint(clientX, clientY);
    if (!hit || !container.contains(hit.node)) return null;
    const { node, offset } = hit;
    if (node.nodeType !== Node.TEXT_NODE) {
        return offset > 0 ? Infinity : 0;
    }
    if (node.parentElement?.closest('[data-chord-anchor]')) return null;

    let col = offset;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: t =>
            t.parentElement?.closest('[data-chord-anchor]')
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
    });
    let current: Node | null;
    while ((current = walker.nextNode())) {
        if (current === node) return col;
        col += current.textContent?.length ?? 0;
    }
    return null;
}

// Approximate width of one font-mono text-xs character (the chord button's
// own font), used to extrapolate columns past a line's last character —
// there's no real text there to hit-test against for an exact position.
const CHORD_CHAR_WIDTH_PX = 7;

/**
 * Column a drag is over at a client point, allowing an extension past the
 * line's last character (stepped off at a fixed width from where the text
 * actually ends) so a chord can be dragged further right than the lyric
 * text goes. Returns null for points that don't resolve to this line at all
 * (e.g. a chord's own anchor).
 */
function dragColAtPoint(lineEl: HTMLElement, line: SheetLine, clientX: number, clientY: number): number | null {
    const col = lyricColAtPoint(lineEl, clientX, clientY);
    if (col === null) return null;
    if (col !== Infinity) return col;
    const endRect = rectForLineCol(lineEl, line, line.lyricText.length);
    const extra = Math.max(0, Math.round((clientX - endRect.right) / CHORD_CHAR_WIDTH_PX));
    return line.lyricText.length + extra;
}

/**
 * Pixel rect for an arbitrary column on a line: within the lyric text via
 * the DOM's own text nodes (pixel-accurate, proportional font and all), or
 * extrapolated at a fixed per-column width past the last character (see
 * `dragColAtPoint`) — used to snap the drag-preview chord to precisely
 * where it would land, including a nudged-off-collision column.
 */
function rectForLineCol(lineEl: HTMLElement, line: SheetLine, col: number): DOMRect {
    const clamped = Math.max(0, Math.min(col, line.lyricText.length));
    let remaining = clamped;
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
        acceptNode: t =>
            t.parentElement?.closest('[data-chord-anchor]')
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
    });
    let node: Node | null;
    let rect: DOMRect | null = null;
    while ((node = walker.nextNode())) {
        const len = node.textContent?.length ?? 0;
        if (remaining <= len) {
            const range = document.createRange();
            range.setStart(node, remaining);
            range.setEnd(node, remaining);
            rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
            break;
        }
        remaining -= len;
    }
    if (!rect) {
        const lineRect = lineEl.getBoundingClientRect();
        rect = new DOMRect(lineRect.left, lineRect.top, 0, lineRect.height);
    }
    const extra = col - clamped;
    return extra > 0
        ? new DOMRect(rect.right + extra * CHORD_CHAR_WIDTH_PX, rect.top, 0, rect.height)
        : rect;
}

/**
 * The rendered song sheet. Each lyric line is plain text with its source
 * spacing intact; every chord is embedded in the text flow as a zero-width
 * anchor at its exact character column, with the chord button hanging above
 * it — positioned free-form, never anchored to a word. Because the anchors
 * live in the flow, a wrapping line carries each chord onto the same visual
 * row as its character. Chords play on click; clicking anywhere in a lyric
 * line opens the chord picker to insert a chord at precisely that character.
 */
interface DragGhost {
    chord: SheetChord;
    x: number;
    y: number;
    /** Landed on an actual drop column (vs. just following the pointer). */
    snapped: boolean;
}

interface ContextMenuTarget {
    chord: SheetChord;
    x: number;
    y: number;
}

interface DragInfo {
    chord: SheetChord;
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
}

const SongSheetView: React.FC<SongSheetViewProps> = ({ song, parsed, source, onSourceChange }) => {
    const stepIndex = useSongStore(state => state.stepIndex);
    const exportSettings = useSongStore(state => state.sheetExportSettings);
    const previewing = useSongStore(state => state.sheetExportPreview);
    const [picker, setPicker] = useState<PickerTarget | null>(null);
    const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
    // Scale and unscaled sheet height of the live print preview, measured
    // once the sheet is laid out at page width (null while not previewing).
    const [preview, setPreview] = useState<{ scale: number; sheetHeight: number } | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Undo, scoped to this sheet's own chord edits (add/move/delete) rather
    // than every keystroke — Ctrl+Z pops the source as it was just before the
    // last one. Reset whenever the displayed song changes.
    const undoStackRef = useRef<string[]>([]);
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragInfoRef = useRef<DragInfo | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressClickRef = useRef(false);

    useEffect(() => {
        undoStackRef.current = [];
    }, [song.id]);

    // Chord labels sit at their exact character column and take no space in
    // the text flow, so close columns can render overlapping labels (see
    // sheetChordLayout). Re-resolve collisions whenever the labels can move:
    // a new parse, a resize that rewraps the lines, or the font swapping in.
    useLayoutEffect(() => {
        const node = sheetRef.current;
        if (!node) return;
        layoutSheetChords(node);
        const observer = new ResizeObserver(() => layoutSheetChords(node));
        observer.observe(node);
        document.fonts?.ready.then(() => layoutSheetChords(node));
        return () => observer.disconnect();
    }, [parsed]);

    // Printing (the toolbar's PDF export or a direct Ctrl+P) re-lays the
    // sheet out at page width and print font sizes, where the on-screen
    // nudges no longer hold; recompute them under the print metrics just
    // before the dialog renders and restore the screen ones after.
    useEffect(() => {
        const onBeforePrint = () => {
            if (sheetRef.current) layoutSheetChordsForPrint(sheetRef.current, exportSettings);
        };
        const onAfterPrint = () => {
            if (sheetRef.current) layoutSheetChords(sheetRef.current);
        };
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('afterprint', onAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', onBeforePrint);
            window.removeEventListener('afterprint', onAfterPrint);
        };
    }, [exportSettings]);

    // While the export options popover is open, the sheet doubles as a live
    // print preview: it wears the same styling the print/PNG paths use
    // (song-sheet-exporting) at the true page width, scaled down to fit the
    // panel. Every settings change re-resolves the chord nudges at the page
    // metrics; the ResizeObserver catches the height changes that follow
    // (font size, columns, margin...) and keeps the scale and the page-break
    // guides in sync.
    useLayoutEffect(() => {
        const node = sheetRef.current;
        if (!node) return;
        if (!previewing) {
            // `preview` can stay stale — everything reading it is gated on
            // `previewing`, and reopening re-measures before paint.
            layoutSheetChords(node); // back to the on-screen nudges
            return;
        }
        const pageWidth = pageWidthPx(exportSettings.orientation);
        const measure = () => {
            layoutSheetChords(node);
            const containerWidth = previewContainerRef.current?.clientWidth ?? pageWidth;
            setPreview({
                scale: Math.min(1, containerWidth / pageWidth),
                sheetHeight: node.offsetHeight,
            });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [previewing, exportSettings, parsed]);

    const commitChange = (next: string) => {
        undoStackRef.current.push(source);
        if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift();
        onSourceChange(next);
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
            // Let native undo run in text fields (title input, picker's typed
            // chord, source editor) instead of hijacking it here.
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea, [contenteditable="true"]')) return;
            if (!undoStackRef.current.length) return;
            e.preventDefault();
            const prev = undoStackRef.current.pop()!;
            onSourceChange(prev);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onSourceChange]);

    const openPicker = (
        e: React.MouseEvent<HTMLElement>,
        target: Omit<PickerTarget, 'anchorRect'>
    ) => {
        e.stopPropagation();
        setPicker({ anchorRect: e.currentTarget.getBoundingClientRect(), ...target });
    };

    const handleSelect = (chordName: string) => {
        if (!picker) return;
        if (picker.chord) {
            commitChange(replaceChordInSource(source, picker.chord, chordName));
        } else if (picker.insert) {
            const { line, col, padBefore } = picker.insert;
            commitChange(insertChordAtColumn(source, line, col, chordName, padBefore));
        }
        setPicker(null);
    };

    const handleRemove = () => {
        if (picker?.chord) {
            commitChange(removeChordFromSource(source, picker.chord));
        }
        setPicker(null);
    };

    const handleChordClick = (e: React.MouseEvent<HTMLElement>, chord: SheetChord) => {
        if (suppressClickRef.current) {
            // Trailing click synthesized after a drag or a long-press menu.
            suppressClickRef.current = false;
            return;
        }
        if (chord.annotation) {
            // Nothing to play — clicking offers to resolve it to a real chord.
            openPicker(e, { insert: null, chord });
            return;
        }
        useSongStore.setState({ stepIndex: chord.seqIndex });
        playSheetChord(chord);
    };

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleChordContextMenu = (e: React.MouseEvent<HTMLButtonElement>, chord: SheetChord) => {
        e.preventDefault();
        e.stopPropagation();
        dragInfoRef.current = null;
        clearLongPressTimer();
        setContextMenu({ chord, x: e.clientX, y: e.clientY });
    };

    const handleContextMenuDelete = () => {
        if (contextMenu) commitChange(removeChordFromSource(source, contextMenu.chord));
        setContextMenu(null);
    };

    const handleChordPointerDown = (e: React.PointerEvent<HTMLButtonElement>, chord: SheetChord) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // contextmenu handles right-click
        suppressClickRef.current = false;
        dragInfoRef.current = {
            chord,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
        };
        if (e.pointerType === 'touch') {
            const { clientX, clientY } = e;
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                const info = dragInfoRef.current;
                if (!info || info.dragging) return;
                dragInfoRef.current = null;
                suppressClickRef.current = true;
                setContextMenu({ chord: info.chord, x: clientX, y: clientY });
            }, LONG_PRESS_MS);
        }
    };

    /** The lyric line (element + parsed line) under a client point, if any. */
    const lineAtPoint = (clientX: number, clientY: number): { el: HTMLElement; line: SheetLine } | null => {
        const dropEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
        const el = dropEl?.closest<HTMLElement>('[data-lyric-line]') ?? null;
        if (!el) return null;
        const line = parsed.lines[Number(el.dataset.lyricLine)];
        return line && line.kind === 'lyrics' ? { el, line } : null;
    };

    const handleChordPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const info = dragInfoRef.current;
        if (!info || info.pointerId !== e.pointerId) return;
        if (!info.dragging) {
            const dx = e.clientX - info.startX;
            const dy = e.clientY - info.startY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
            clearLongPressTimer();
            info.dragging = true;
            suppressClickRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        // Snap the preview to where the chord would actually land — nudged
        // off any column already holding another chord — so it never shows
        // (or leads to) two chords landing on top of each other. Falls back
        // to raw pointer coordinates over dead space where there's no line
        // to snap to.
        const target = lineAtPoint(e.clientX, e.clientY);
        const rawCol = target ? dragColAtPoint(target.el, target.line, e.clientX, e.clientY) : null;
        if (target && rawCol !== null) {
            const col = nextFreeColumn(target.line, rawCol, info.chord);
            const rect = rectForLineCol(target.el, target.line, col);
            setDragGhost({ chord: info.chord, x: rect.left, y: rect.top, snapped: true });
        } else {
            setDragGhost({ chord: info.chord, x: e.clientX, y: e.clientY, snapped: false });
        }
    };

    const handleChordPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        const info = dragInfoRef.current;
        clearLongPressTimer();
        dragInfoRef.current = null;
        if (!info || info.pointerId !== e.pointerId) return;
        if (!info.dragging) return; // plain tap/click — onClick handles it
        setDragGhost(null);

        const target = lineAtPoint(e.clientX, e.clientY);
        if (!target) return;
        const rawCol = dragColAtPoint(target.el, target.line, e.clientX, e.clientY);
        if (rawCol === null) return;
        const col = nextFreeColumn(target.line, rawCol, info.chord);
        commitChange(moveChordToColumn(source, info.chord, target.line, col));
    };

    const handleChordPointerCancel = () => {
        clearLongPressTimer();
        dragInfoRef.current = null;
        setDragGhost(null);
    };

    const handleLyricClick = (e: React.MouseEvent<HTMLDivElement>, line: SheetLine) => {
        const rawCol = lyricColAtPoint(e.currentTarget, e.clientX, e.clientY);
        if (rawCol === null) return;
        e.stopPropagation();
        const col = nextFreeColumn(line, rawCol === Infinity ? line.lyricText.length : rawCol);
        const lineRect = e.currentTarget.getBoundingClientRect();
        setPicker({
            anchorRect: new DOMRect(e.clientX, lineRect.bottom - 20, 0, 20),
            insert: { line, col, padBefore: false },
            chord: null,
        });
    };

    const renderChordAnchor = (chord: SheetChord) => (
        // A zero-width, extra-tall inline-block whose bottom sits on the text
        // baseline: it takes no horizontal space (lyric spacing is untouched),
        // wraps together with the character it precedes, and raises only the
        // visual rows that actually hold a chord.
        <span
            key={`chord-${chord.sourceStart}`}
            data-chord-anchor
            className="relative inline-block w-0 h-[2em] select-none"
        >
            {/* Pinned line-height: the export line-spacing setting raises the
                lyric line-height, and letting this wrapper inherit it would
                push the chord down the anchor into the lyric text. */}
            <span className="absolute left-0 top-0 whitespace-pre leading-tight">
                <button
                    onClick={e => {
                        e.stopPropagation();
                        handleChordClick(e, chord);
                    }}
                    onDoubleClick={e => openPicker(e, { insert: null, chord })}
                    onContextMenu={e => handleChordContextMenu(e, chord)}
                    onPointerDown={e => handleChordPointerDown(e, chord)}
                    onPointerMove={handleChordPointerMove}
                    onPointerUp={handleChordPointerUp}
                    onPointerCancel={handleChordPointerCancel}
                    style={{ touchAction: 'none' }}
                    className={classNames(
                        'font-mono text-xs leading-tight px-0.5 -mx-0.5 rounded transition-colors cursor-grab active:cursor-grabbing',
                        chord.annotation
                            ? 'font-medium italic text-mcb-tertiary hover:bg-[var(--mcb-bg-hover)]'
                            : chord.seqIndex === stepIndex
                                ? 'font-semibold text-[var(--mcb-accent-text-primary)] bg-[var(--mcb-accent-primary)]/25 ring-1 ring-[var(--mcb-accent-primary)]/60'
                                : 'font-semibold text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/15',
                        dragGhost?.chord.sourceStart === chord.sourceStart && 'opacity-30'
                    )}
                    title={chord.annotation
                        ? 'Not recognized as a chord — click to set one, drag to move, right-click to delete'
                        : 'Click to play, drag to move, double-click to change, right-click to delete'}
                >
                    {chord.name}
                </button>
            </span>
        </span>
    );

    const renderLyricLine = (line: SheetLine, lineIndex: number) => {
        const parts: React.ReactNode[] = [];
        let pos = 0;
        for (const chord of line.chords) {
            if (chord.col > pos) {
                parts.push(
                    <React.Fragment key={`text-${pos}`}>
                        {line.lyricText.slice(pos, chord.col)}
                    </React.Fragment>
                );
                pos = chord.col;
            }
            parts.push(renderChordAnchor(chord));
        }
        if (pos < line.lyricText.length) {
            parts.push(
                <React.Fragment key={`text-${pos}`}>{line.lyricText.slice(pos)}</React.Fragment>
            );
        }

        return (
            <div key={lineIndex} className="break-inside-avoid flex items-end gap-x-1">
                <div
                    onClick={e => handleLyricClick(e, line)}
                    data-lyric-line={lineIndex}
                    className="sheet-lyric flex-1 min-w-0 whitespace-pre-wrap text-sm leading-tight text-mcb-primary cursor-text rounded transition-colors hover:bg-[var(--mcb-bg-hover)]/60"
                    title="Click to add a chord here"
                >
                    {parts}
                </div>
                {/* Append slot at the end of the line */}
                <button
                    onClick={e => openPicker(e, {
                        insert: { line, col: nextFreeColumn(line, line.lyricText.length), padBefore: true },
                        chord: null,
                    })}
                    className="shrink-0 mb-[1px] w-4 h-4 flex items-center justify-center rounded text-mcb-tertiary opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-[var(--mcb-bg-hover)] transition-all print-hidden"
                    title="Add a chord at the end of this line"
                >
                    <PlusIcon className="w-3 h-3" />
                </button>
            </div>
        );
    };

    // Live-preview page geometry, all in unscaled CSS px (96/in — the same
    // resolution the print and PNG paths assume). Vertical margins are real
    // page margins when printing, so each page holds pageContent of sheet;
    // the preview's own top padding stands in for page 1's top margin.
    const pageWidth = pageWidthPx(exportSettings.orientation);
    const previewMarginPx = exportSettings.margin * 96;
    const previewPageContentPx = pageHeightPx(exportSettings.orientation) - 2 * previewMarginPx;
    const previewPageCount = preview
        ? Math.max(1, Math.ceil((preview.sheetHeight - 2 * previewMarginPx) / previewPageContentPx))
        : 1;

    return (
        <div ref={previewContainerRef} className={previewing ? 'overflow-hidden' : undefined}>
            {previewing && preview && (
                <div className="flex items-baseline justify-between mb-1.5">
                    <span className="mcb-label">Print preview</span>
                    <span className="text-[0.625rem] text-mcb-tertiary">
                        {previewPageCount === 1 ? '1 page' : `~${previewPageCount} pages`}
                    </span>
                </div>
            )}
            {/* Scaler: the sheet lays out at the true page width and a
                transform shrinks it to the panel; the negative bottom margin
                gives the unscaled layout height back to the page flow. A
                real print must see none of this (see songSheetPrint.css). */}
            <div
                // Inset hairline: an outer shadow would be clipped by the
                // container's overflow-hidden, and the page must stay
                // outlined on light backgrounds.
                className={previewing
                    ? 'sheet-preview-scale relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]'
                    : undefined}
                style={previewing ? {
                    width: pageWidth,
                    ...(preview && {
                        transform: `scale(${preview.scale})`,
                        transformOrigin: 'top left',
                        marginBottom: -(preview.sheetHeight * (1 - preview.scale)),
                    }),
                } : undefined}
            >
                {/* The --sheet-* variables carry the export settings; they're inert on
                    screen and only consumed by the print/exporting rules in
                    songSheetPrint.css, so the on-screen sheet only changes while the
                    preview holds the exporting class. */}
                <div
                    id="song-sheet-print"
                    ref={sheetRef}
                    className={classNames(
                        'mcb-inset p-4 space-y-1.5 text-left',
                        previewing && 'song-sheet-exporting'
                    )}
                    style={{
                        '--sheet-margin': exportSettings.margin,
                        '--sheet-columns': exportSettings.columns,
                        '--sheet-line-spacing': exportSettings.lineSpacing,
                        '--sheet-lyric-size': exportSettings.lyricSize,
                        '--sheet-chord-size': exportSettings.chordSize,
                        ...(previewing && { width: pageWidth }),
                    } as React.CSSProperties}
                >
                    {song.title.trim() && (
                        <h2 className="text-base font-bold text-mcb-primary mb-3">{song.title}</h2>
                    )}
                    <div className="sheet-lines space-y-1.5">
                        {parsed.lines.map((line, index) => {
                            if (line.kind === 'empty') return <div key={index} className="h-3" />;
                            if (line.kind === 'section') {
                                return (
                                    <div key={index} className="mcb-label !text-[0.6875rem] pt-2">
                                        {line.label}
                                    </div>
                                );
                            }
                            return renderLyricLine(line, index);
                        })}
                    </div>
                    {parsed.lines.every(l => l.kind === 'empty') && (
                        <p className="text-xs text-mcb-tertiary">
                            This song is empty — switch to Edit and paste or type some lyrics.
                        </p>
                    )}

                    {picker && (
                        <ChordPickerPopover
                            anchorRect={picker.anchorRect}
                            editingChord={picker.chord}
                            onSelect={handleSelect}
                            onRemove={picker.chord ? handleRemove : null}
                            onClose={() => setPicker(null)}
                        />
                    )}

                    {contextMenu && (
                        <ChordContextMenu
                            chord={contextMenu.chord}
                            x={contextMenu.x}
                            y={contextMenu.y}
                            onDelete={handleContextMenuDelete}
                            onClose={() => setContextMenu(null)}
                        />
                    )}

                    {dragGhost && createPortal(
                        <div
                            className={classNames(
                                'fixed z-[1200] pointer-events-none font-mono text-xs font-semibold px-1.5 py-0.5 rounded shadow-lg text-[var(--mcb-accent-text-primary)]',
                                dragGhost.snapped ? 'bg-[var(--mcb-accent-primary)]' : 'bg-[var(--mcb-accent-primary)]/60'
                            )}
                            style={
                                dragGhost.snapped
                                    // Sit right above the column it would land on, like
                                    // the real chord anchor does above the lyric text.
                                    ? { left: dragGhost.x, top: dragGhost.y - 4, transform: 'translateY(-100%)' }
                                    : { left: dragGhost.x + 14, top: dragGhost.y - 10 }
                            }
                        >
                            {dragGhost.chord.name}
                        </div>,
                        document.body
                    )}
                </div>

                {/* Where the printed pages will break, drawn over the preview
                    (approximate — the browser may paginate a line or two off).
                    Sits outside #song-sheet-print so neither the print rules nor
                    the PNG capture ever see it. Hairline and label thicken by
                    1/scale so they stay legible at any zoom. */}
                {previewing && preview && previewPageCount > 1 && (
                    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                        {Array.from({ length: previewPageCount - 1 }, (_, i) => (
                            <div
                                key={i}
                                className="absolute left-0 right-0 border-t border-dashed border-black/30"
                                style={{
                                    top: previewMarginPx + (i + 1) * previewPageContentPx,
                                    borderTopWidth: Math.max(1, 1 / preview.scale),
                                }}
                            >
                                <span
                                    className="absolute right-2 top-1 px-1 rounded-sm bg-white/80 text-neutral-400 leading-none"
                                    style={{ fontSize: 10 / preview.scale }}
                                >
                                    page {i + 2}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SongSheetView;
