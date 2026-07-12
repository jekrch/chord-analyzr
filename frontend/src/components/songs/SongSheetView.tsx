import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Song, playSheetChord, useSongStore } from '../../stores/songStore';
import {
    ParsedSong,
    SheetChord,
    SheetLine,
    insertChordInSource,
    removeChordFromSource,
    replaceChordInSource,
    sourceOffsetAtCol,
} from '../../util/SongSheetParser';
import ChordPickerPopover from './ChordPickerPopover';

interface SongSheetViewProps {
    song: Song;
    parsed: ParsedSong;
    /** Inline-format source that `parsed`'s offsets refer to. */
    source: string;
    onSourceChange: (nextInlineSource: string) => void;
}

interface PickerTarget {
    anchorRect: DOMRect;
    /** Insert a new chord at this source offset (padding with a space if needed)... */
    insertAt: number | null;
    padBefore: boolean;
    /** ...or edit this existing chord. */
    chord: SheetChord | null;
}

/**
 * Character column under a client point within a lyric line element. The
 * line's text is split into several nodes around the chord anchors, so the
 * column is the caret offset in the hit node plus all lyric text before it.
 * Returns Infinity for points right of the text (callers clamp to the end)
 * and null for points that belong to a chord's own click handlers.
 */
function lyricColAtPoint(container: HTMLElement, clientX: number, clientY: number): number | null {
    const doc = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    let node: Node | null = null;
    let offset = 0;
    if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(clientX, clientY);
        if (pos) ({ offsetNode: node, offset } = pos);
    } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(clientX, clientY);
        if (range) ({ startContainer: node, startOffset: offset } = range);
    }
    if (!node || !container.contains(node)) return null;
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

/**
 * The rendered song sheet. Each lyric line is plain text with its source
 * spacing intact; every chord is embedded in the text flow as a zero-width
 * anchor at its exact character column, with the chord button hanging above
 * it — positioned free-form, never anchored to a word. Because the anchors
 * live in the flow, a wrapping line carries each chord onto the same visual
 * row as its character. Chords play on click; clicking anywhere in a lyric
 * line opens the chord picker to insert a chord at precisely that character.
 */
const SongSheetView: React.FC<SongSheetViewProps> = ({ song, parsed, source, onSourceChange }) => {
    const stepIndex = useSongStore(state => state.stepIndex);
    const [picker, setPicker] = useState<PickerTarget | null>(null);

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
            onSourceChange(replaceChordInSource(source, picker.chord, chordName));
        } else if (picker.insertAt !== null) {
            let spliced = source;
            let offset = picker.insertAt;
            if (picker.padBefore && offset > 0 && !/\s/.test(spliced[offset - 1])) {
                spliced = `${spliced.slice(0, offset)} ${spliced.slice(offset)}`;
                offset += 1;
            }
            onSourceChange(insertChordInSource(spliced, offset, chordName));
        }
        setPicker(null);
    };

    const handleRemove = () => {
        if (picker?.chord) {
            onSourceChange(removeChordFromSource(source, picker.chord));
        }
        setPicker(null);
    };

    const handleChordClick = (chord: SheetChord) => {
        useSongStore.setState({ stepIndex: chord.seqIndex });
        playSheetChord(chord);
    };

    const handleLyricClick = (e: React.MouseEvent<HTMLDivElement>, line: SheetLine) => {
        const col = lyricColAtPoint(e.currentTarget, e.clientX, e.clientY);
        if (col === null) return;
        e.stopPropagation();
        const lineRect = e.currentTarget.getBoundingClientRect();
        setPicker({
            anchorRect: new DOMRect(e.clientX, lineRect.bottom - 20, 0, 20),
            insertAt: sourceOffsetAtCol(line, col),
            padBefore: false,
            chord: null,
        });
    };

    const renderChordAnchor = (chord: SheetChord) => (
        // A zero-width, extra-tall inline-block whose bottom sits on the text
        // baseline: it takes no horizontal space (lyric spacing is untouched),
        // wraps together with the character it precedes, and raises only the
        // visual rows that actually hold a chord.
        <span
            key={`chord-${chord.seqIndex}`}
            data-chord-anchor
            className="relative inline-block w-0 h-[2em] select-none"
        >
            <span className="absolute left-0 top-0 whitespace-pre">
                <button
                    onClick={e => {
                        e.stopPropagation();
                        handleChordClick(chord);
                    }}
                    onDoubleClick={e => openPicker(e, { insertAt: null, padBefore: false, chord })}
                    className={classNames(
                        'font-mono text-xs font-semibold leading-tight px-0.5 -mx-0.5 rounded transition-colors',
                        chord.seqIndex === stepIndex
                            ? 'text-[var(--mcb-accent-text-primary)] bg-[var(--mcb-accent-primary)]/25 ring-1 ring-[var(--mcb-accent-primary)]/60'
                            : 'text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/15'
                    )}
                    title="Click to play, double-click to change"
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
                    className="flex-1 min-w-0 whitespace-pre-wrap text-sm leading-tight text-mcb-primary cursor-text rounded transition-colors hover:bg-[var(--mcb-bg-hover)]/60"
                    title="Click to add a chord here"
                >
                    {parts}
                </div>
                {/* Append slot at the end of the line */}
                <button
                    onClick={e => openPicker(e, { insertAt: line.sourceEnd, padBefore: true, chord: null })}
                    className="shrink-0 mb-[1px] w-4 h-4 flex items-center justify-center rounded text-mcb-tertiary opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-[var(--mcb-bg-hover)] transition-all print-hidden"
                    title="Add a chord at the end of this line"
                >
                    <PlusIcon className="w-3 h-3" />
                </button>
            </div>
        );
    };

    return (
        <div id="song-sheet-print" className="mcb-inset p-4 space-y-1.5 text-left">
            {song.title.trim() && (
                <h2 className="text-base font-bold text-mcb-primary mb-3">{song.title}</h2>
            )}
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
        </div>
    );
};

export default SongSheetView;
