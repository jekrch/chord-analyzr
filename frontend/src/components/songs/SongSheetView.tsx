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
 * The rendered song sheet: lyric lines as rows of word cells with chords
 * above them. Chords play on click; words open the chord picker to place,
 * change or remove a chord at that spot.
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

    const renderLyricLine = (line: SheetLine, lineIndex: number) => {
        const hasChords = line.tokens.some(t => t.chord);
        return (
            <div key={lineIndex} className="flex flex-wrap items-end gap-x-[0.45em] gap-y-1.5">
                {line.tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex} className="inline-flex flex-col items-start">
                        {hasChords && (
                            token.chord ? (
                                <button
                                    onClick={() => handleChordClick(token.chord!)}
                                    onDoubleClick={e => openPicker(e, { insertAt: null, padBefore: false, chord: token.chord })}
                                    className={classNames(
                                        'font-mono text-xs font-semibold leading-tight px-0.5 -mx-0.5 rounded transition-colors',
                                        token.chord.seqIndex === stepIndex
                                            ? 'text-[var(--mcb-accent-text-primary)] bg-[var(--mcb-accent-primary)]/25 ring-1 ring-[var(--mcb-accent-primary)]/60'
                                            : 'text-[var(--mcb-accent-text-primary)] hover:bg-[var(--mcb-accent-primary)]/15'
                                    )}
                                    title="Click to play, double-click to change"
                                >
                                    {token.chord.name}
                                </button>
                            ) : (
                                <span className="text-xs leading-tight select-none">&nbsp;</span>
                            )
                        )}
                        <button
                            onClick={e =>
                                token.chord
                                    ? openPicker(e, { insertAt: null, padBefore: false, chord: token.chord })
                                    : openPicker(e, { insertAt: token.sourceStart, padBefore: false, chord: null })
                            }
                            className={classNames(
                                'text-sm leading-tight text-mcb-primary rounded px-0.5 -mx-0.5 transition-colors',
                                'hover:bg-[var(--mcb-bg-hover)] hover:text-white',
                                !token.text && 'text-mcb-tertiary'
                            )}
                            title={token.chord ? 'Change or remove this chord' : 'Add a chord here'}
                        >
                            {token.text || '·'}
                        </button>
                    </span>
                ))}
                {/* Append slot at the end of the line */}
                <button
                    onClick={e => openPicker(e, { insertAt: line.sourceEnd, padBefore: true, chord: null })}
                    className="self-end mb-[1px] w-4 h-4 flex items-center justify-center rounded text-mcb-tertiary opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-[var(--mcb-bg-hover)] transition-all print-hidden"
                    title="Add a chord at the end of this line"
                >
                    <PlusIcon className="w-3 h-3" />
                </button>
            </div>
        );
    };

    return (
        <div id="song-sheet-print" className="mcb-inset p-4 space-y-1.5 text-left overflow-x-auto">
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
