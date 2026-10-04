import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { XMarkIcon, MusicalNoteIcon, PlayIcon, PlusIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { dynamicChordGenerator } from '../services/DynamicChordService';
import { staticDataService } from '../services/StaticDataService';
import { ModeScaleChordDto, ScaleNoteDto } from '../api';
import { noteNameToNumber } from '../util/NoteUtil';
import { useExitTransition } from '../hooks/useExitTransition';
import { useScrollLock } from '../hooks/useScrollLock';

interface ChordFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectChord?: (chord: ModeScaleChordDto, slashNote?: string, fullNotes?: string) => void;
    onPlayNotes?: (notes: string) => void;
    currentKey: string;
    currentMode: string;
}

interface ChordMatch {
    chord: ModeScaleChordDto;
    matchType: 'exact' | 'reordered' | 'with-slash';
    slashNote?: string;
    slashPitchClass?: number;
    score: number;
    pitchClasses: Set<number>;
}

// Chromatic note arrays for fallback naming
const CHROMATIC_SHARPS_DISPLAY = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const CHROMATIC_FLATS_DISPLAY = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const CHROMATIC_SHARPS_PLAY = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS_PLAY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const WHITE_KEY_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEY_CONFIG = [
    { pc: 1, leftPercent: 9.5 },
    { pc: 3, leftPercent: 23.5 },
    { pc: 6, leftPercent: 52 },
    { pc: 8, leftPercent: 66.5 },
    { pc: 10, leftPercent: 81 },
];

interface MiniPianoProps {
    highlightedNotes: Set<number>;
    rootNote?: number;
    className?: string;
}

const MiniPiano: React.FC<MiniPianoProps> = ({ highlightedNotes, rootNote, className }) => {
    const notesArray = Array.from(highlightedNotes);
    const maxNoteIndex = notesArray.length > 0 ? Math.max(...notesArray) : 11;
    const octaves = Math.max(1, Math.floor(maxNoteIndex / 12) + 1);

    const octaveWidthPercent = 100 / octaves;
    const blackKeyWidth = octaveWidthPercent * 0.09;
    const pianoWidth = octaves * 56;

    const keyState = (noteIndex: number) => ({
        'is-root': noteIndex === rootNote,
        'is-on': highlightedNotes.has(noteIndex) && noteIndex !== rootNote,
    });

    return (
        <div
            className={classNames("mcb-keys h-7 flex-shrink-0 rounded-sm p-px", className)}
            style={{ width: `${pianoWidth}px` }}
            aria-hidden="true"
        >
            <div className="relative h-full flex gap-px">
                {Array.from({ length: octaves }).flatMap((_, octaveIdx) =>
                    WHITE_KEY_PITCH_CLASSES.map((pc) => {
                        const noteIndex = octaveIdx * 12 + pc;
                        return <div key={noteIndex} className={classNames("mcb-keys__white flex-1", keyState(noteIndex))} />;
                    })
                )}
                {Array.from({ length: octaves }).flatMap((_, octaveIdx) =>
                    BLACK_KEY_CONFIG.map(({ pc, leftPercent }) => {
                        const noteIndex = octaveIdx * 12 + pc;
                        const leftPos = (octaveIdx * octaveWidthPercent) + (leftPercent * octaveWidthPercent / 100);
                        return (
                            <div
                                key={noteIndex}
                                style={{ left: `${leftPos}%`, width: `${blackKeyWidth}%` }}
                                className={classNames("mcb-keys__black", keyState(noteIndex))}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

interface TogglePianoProps {
    selectedNotes: Set<number>;
    rootNote?: number;
    onToggleNote: (noteIndex: number) => void;
    getNoteName: (noteIndex: number) => string;
    octaves?: number;
}

const TogglePiano: React.FC<TogglePianoProps> = ({ selectedNotes, rootNote, onToggleNote, getNoteName, octaves = 3 }) => {
    const octaveWidthPercent = 100 / octaves;
    const blackKeyWidth = octaveWidthPercent * 0.09;
    const minWidth = octaves * 7 * 32;

    const keyState = (noteIndex: number) => ({
        'is-root': noteIndex === rootNote,
        'is-on': selectedNotes.has(noteIndex) && noteIndex !== rootNote,
    });

    return (
        // height tracks the visible width (cqw), so keys keep a natural shape
        // and never take over short screens
        <div className="overflow-x-auto" style={{ containerType: 'inline-size' }}>
            <div
                className="mcb-keys rounded-sm p-px"
                style={{ minWidth: `${minWidth}px`, height: 'clamp(4.5rem, min(15cqw, 24vh), 8.5rem)' }}
            >
                <div className="relative h-full flex gap-px">
                    {Array.from({ length: octaves }).flatMap((_, octaveIdx) =>
                        WHITE_KEY_PITCH_CLASSES.map((pc) => {
                            const noteIndex = octaveIdx * 12 + pc;
                            return (
                                <button
                                    key={noteIndex}
                                    onClick={() => onToggleNote(noteIndex)}
                                    className={classNames("mcb-keys__white relative flex-1 focus:outline-none", keyState(noteIndex))}
                                    aria-label={getNoteName(noteIndex)}
                                    aria-pressed={selectedNotes.has(noteIndex)}
                                >
                                    {pc === 0 && <span className="mcb-keys__label">{getNoteName(noteIndex)}</span>}
                                </button>
                            );
                        })
                    )}
                    {Array.from({ length: octaves }).flatMap((_, octaveIdx) =>
                        BLACK_KEY_CONFIG.map(({ pc, leftPercent }) => {
                            const noteIndex = octaveIdx * 12 + pc;
                            const leftPos = (octaveIdx * octaveWidthPercent) + (leftPercent * octaveWidthPercent / 100);
                            return (
                                <button
                                    key={noteIndex}
                                    onClick={() => onToggleNote(noteIndex)}
                                    style={{ left: `${leftPos}%`, width: `${blackKeyWidth}%` }}
                                    className={classNames("mcb-keys__black focus:outline-none", keyState(noteIndex))}
                                    aria-label={getNoteName(noteIndex)}
                                    aria-pressed={selectedNotes.has(noteIndex)}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

const ChordFinderModal: React.FC<ChordFinderModalProps> = ({
    isOpen,
    onClose,
    onSelectChord,
    onPlayNotes,
    currentKey,
    currentMode
}) => {
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [allChords, setAllChords] = useState<ModeScaleChordDto[]>([]);
    const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const sortedSelectedNotes = useMemo(() => {
        return Array.from(selectedNotes).sort((a, b) => a - b);
    }, [selectedNotes]);

    // Determine if scale uses flats based on scale notes and key
    const scaleUsesFlats = useMemo(() => {
        const hasFlatsInScale = scaleNotes.some(note =>
            note.noteName && note.noteName.includes('b')
        );
        const keyHasFlat = currentKey.includes('b');
        return hasFlatsInScale || keyHasFlat;
    }, [scaleNotes, currentKey]);

    // Get note name for a pitch class (display version with unicode)
    const getNoteNameForPitchClass = useCallback((pitchClass: number, forPlayback: boolean = false): string => {
        const normalizedPitchClass = ((pitchClass % 12) + 12) % 12;

        // First check if this pitch class is in the scale
        const scaleNote = scaleNotes.find(note => {
            if (!note.noteName) return false;
            // noteNameToNumber is guaranteed to return 0-11, so we don't need modulo here
            const noteNum = noteNameToNumber(note.noteName);
            return noteNum === normalizedPitchClass;
        });

        if (scaleNote?.noteName) {
            if (forPlayback) {
                // Convert unicode to ASCII for playback
                return scaleNote.noteName.replace('♯', '#').replace('♭', 'b');
            }
            // Convert ASCII to unicode for display
            return scaleNote.noteName.replace('#', '♯').replace('b', '♭');
        }

        // Fall back to chromatic naming based on scale context
        if (forPlayback) {
            return scaleUsesFlats ? CHROMATIC_FLATS_PLAY[normalizedPitchClass] : CHROMATIC_SHARPS_PLAY[normalizedPitchClass];
        }
        return scaleUsesFlats ? CHROMATIC_FLATS_DISPLAY[normalizedPitchClass] : CHROMATIC_SHARPS_DISPLAY[normalizedPitchClass];
    }, [scaleNotes, scaleUsesFlats]);

    // Convert selected note indices to playable notes string
    const selectedNotesString = useMemo(() => {
        return sortedSelectedNotes.map(noteIdx => {
            const pitchClass = ((noteIdx % 12) + 12) % 12;
            const octave = Math.floor(noteIdx / 12) + 4;
            return `${getNoteNameForPitchClass(pitchClass, true)}${octave}`;
        }).join(', ');
    }, [sortedSelectedNotes, getNoteNameForPitchClass]);

    // Fetch scale notes for proper note naming
    useEffect(() => {
        if (isOpen && currentKey && currentMode) {
            staticDataService.getScaleNotes(currentKey, currentMode)
                .then(notes => setScaleNotes(notes))
                .catch(err => console.error('Failed to load scale notes:', err));
        }
    }, [isOpen, currentKey, currentMode]);

    useEffect(() => {
        if (isOpen && currentKey && currentMode) {
            setIsLoading(true);

            const generateAllChords = async () => {
                const chords: ModeScaleChordDto[] = [];
                const chordTypes = dynamicChordGenerator.getChordTypes();
                const roots = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

                for (const root of roots) {
                    for (const chordType of chordTypes) {
                        try {
                            const chord = await dynamicChordGenerator.generateChord(root, chordType, currentKey, currentMode);
                            if (chord) {
                                chords.push({
                                    keyName: chord.keyName,
                                    modeId: chord.modeId,
                                    chordNote: chord.chordNote,
                                    chordNoteName: chord.chordNoteName,
                                    chordName: chord.chordName,
                                    chordNotes: chord.chordNotes,
                                    chordNoteNames: chord.chordNoteNames
                                });
                            }
                        } catch (e) {
                            // Skip failed generations
                        }
                    }
                }
                return chords;
            };

            generateAllChords()
                .then(chords => {
                    setAllChords(chords);
                    setIsLoading(false);
                })
                .catch((err: any) => {
                    console.error('Failed to generate chords:', err);
                    setIsLoading(false);
                });
        }
    }, [isOpen, currentKey, currentMode]);

    const { isRendered, isClosing } = useExitTransition(isOpen);
    useScrollLock(isRendered);

    // Start each opening with a clean selection
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) setSelectedNotes(new Set());
    }

    // Backdrop closes only when the press both starts and ends on it, so a
    // drag that ends outside the panel doesn't dismiss it
    const pressStartedOnBackdrop = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    const getChordPitchClasses = useCallback((chord: ModeScaleChordDto): Set<number> => {
        if (!chord.chordNoteNames) return new Set();
        const noteNames = chord.chordNoteNames.split(',').map(n => n.trim());
        const pitchClasses = new Set<number>();

        for (const name of noteNames) {
            try {
                // noteNameToNumber guarantees 0-11, direct usage is safe
                const noteNum = noteNameToNumber(name);
                pitchClasses.add(noteNum);
            } catch (e) {
                console.warn(`Could not parse note: ${name}`);
            }
        }
        return pitchClasses;
    }, []);

    const selectedPitchClassesOrdered = useMemo(() => {
        return sortedSelectedNotes.map(noteIdx => ((noteIdx % 12) + 12) % 12);
    }, [sortedSelectedNotes]);

    const selectedPitchClassesSet = useMemo(() => {
        return new Set(selectedPitchClassesOrdered);
    }, [selectedPitchClassesOrdered]);

    const matchingChords = useMemo((): ChordMatch[] => {
        if (selectedPitchClassesSet.size === 0) return [];

        const matches: ChordMatch[] = [];
        const selectedArray = Array.from(selectedPitchClassesSet).sort((a, b) => a - b);
        const rootPitchClass = selectedPitchClassesOrdered[0];
        const seenSignatures = new Set<string>();

        for (const chord of allChords) {
            const chordPitchClasses = getChordPitchClasses(chord);
            if (chordPitchClasses.size === 0) continue;

            const chordArray = Array.from(chordPitchClasses).sort((a, b) => a - b);
            const chordTypeOnly = chord.chordName?.replace(/^[A-G][#bx♯♭]*/, '') || '';
            const signature = `${chordArray.join(',')}-${chordTypeOnly}`;

            if (chordPitchClasses.size === selectedPitchClassesSet.size) {
                const isMatch = selectedArray.every(note => chordPitchClasses.has(note));
                if (isMatch) {
                    if (seenSignatures.has(signature)) continue;
                    seenSignatures.add(signature);

                    const chordNoteNames = chord.chordNoteNames?.split(',').map(n => n.trim()) || [];
                    // Simplified: removed redundant modulo math
                    const chordRootPitchClass = chordNoteNames[0]
                        ? noteNameToNumber(chordNoteNames[0])
                        : -1;
                    const isRootMatch = chordRootPitchClass === rootPitchClass;

                    matches.push({
                        chord,
                        matchType: isRootMatch ? 'exact' : 'reordered',
                        score: isRootMatch ? 100 : 90,
                        pitchClasses: chordPitchClasses
                    });
                }
            }

            if (selectedPitchClassesSet.size === chordPitchClasses.size + 1) {
                const extraNotes = selectedArray.filter(note => !chordPitchClasses.has(note));
                if (extraNotes.length === 1 && extraNotes[0] === rootPitchClass) {
                    const slashSignature = `${signature}-/${extraNotes[0]}`;
                    if (seenSignatures.has(slashSignature)) continue;
                    seenSignatures.add(slashSignature);

                    // Use properly spelled note name for slash note
                    const slashNoteName = getNoteNameForPitchClass(extraNotes[0], false);
                    const combinedPitchClasses = new Set(chordPitchClasses);
                    combinedPitchClasses.add(extraNotes[0]);

                    matches.push({
                        chord,
                        matchType: 'with-slash',
                        slashNote: slashNoteName,
                        slashPitchClass: extraNotes[0],
                        score: 70,
                        pitchClasses: combinedPitchClasses
                    });
                }
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }, [selectedPitchClassesSet, selectedPitchClassesOrdered, allChords, getChordPitchClasses, getNoteNameForPitchClass]);

    const toggleNote = useCallback((noteIndex: number) => {
        setSelectedNotes(prev => {
            const next = new Set(prev);
            if (next.has(noteIndex)) {
                next.delete(noteIndex);
            } else {
                next.add(noteIndex);
            }
            return next;
        });
    }, []);

    const clearSelection = () => setSelectedNotes(new Set());

    const handleSelectChord = (e: React.MouseEvent, match: ChordMatch) => {
        e.stopPropagation();
        if (onSelectChord) {
            // Convert slash note to ASCII for the callback
            const slashNoteAscii = match.slashNote?.replace('♯', '#').replace('♭', 'b');

            let fullNotes = match.chord.chordNoteNames || '';

            // Construct full playable notes string for the callback
            if (match.slashNote && match.slashPitchClass !== undefined) {
                const slashNotePlayable = getNoteNameForPitchClass(match.slashPitchClass, true);
                const slashNoteWithOctave = `${slashNotePlayable}3`;
                fullNotes = `${slashNoteWithOctave}, ${fullNotes}`;
            }

            onSelectChord(match.chord, slashNoteAscii, fullNotes);
        }
        onClose();
    };

    const handlePlayChord = (e: React.MouseEvent, match: ChordMatch) => {
        e.stopPropagation();
        if (onPlayNotes && match.chord.chordNoteNames) {
            // If there's a slash note, prepend it
            if (match.slashNote && match.slashPitchClass !== undefined) {
                const slashNotePlayable = getNoteNameForPitchClass(match.slashPitchClass, true);
                const slashNoteWithOctave = `${slashNotePlayable}3`;
                onPlayNotes(`${slashNoteWithOctave}, ${match.chord.chordNoteNames}`);
            } else {
                onPlayNotes(match.chord.chordNoteNames);
            }
        }
    };

    const getNoteDisplayName = useCallback((noteIndex: number): string => {
        const pitchClass = ((noteIndex % 12) + 12) % 12;
        const octave = Math.floor(noteIndex / 12) + 4;
        return `${getNoteNameForPitchClass(pitchClass, false)}${octave}`;
    }, [getNoteNameForPitchClass]);

    const getChordNoteIndices = useCallback((chord: ModeScaleChordDto, slashPitchClass?: number): Set<number> => {
        if (!chord.chordNoteNames) return new Set();
        const noteNames = chord.chordNoteNames.split(',').map(n => n.trim());

        if (noteNames.length === 0) return new Set();

        const midiNumbers: number[] = [];
        let currentMidi = 48;

        for (const name of noteNames) {
            try {
                const pitchClass = noteNameToNumber(name);

                const octaveBase = Math.floor(currentMidi / 12) * 12;
                let targetMidi = octaveBase + pitchClass;

                if (targetMidi < currentMidi) {
                    targetMidi += 12;
                }

                midiNumbers.push(targetMidi);
                currentMidi = targetMidi;
            } catch (e) {
                // skip invalid notes
            }
        }

        if (midiNumbers.length === 0) return new Set();

        if (slashPitchClass !== undefined) {
            const lowestMidi = midiNumbers[0];
            const lowestOctave = Math.floor(lowestMidi / 12);
            let slashMidi = (lowestOctave - 1) * 12 + slashPitchClass;
            if (slashMidi >= lowestMidi) {
                slashMidi -= 12;
            }
            midiNumbers.unshift(slashMidi);
        }

        const minMidi = Math.min(...midiNumbers);
        const baseOffset = minMidi - (minMidi % 12);

        const indices = midiNumbers.map(m => m - baseOffset);

        return new Set(indices);
    }, []);

    if (!isRendered) return null;

    const bassNote = sortedSelectedNotes[0];
    const keyClass = "h-8 w-8 flex-shrink-0 inline-flex items-center justify-center rounded-md border transition-colors";

    const renderMiniPiano = (match: ChordMatch, className?: string) => {
        const notes = getChordNoteIndices(match.chord, match.slashPitchClass);
        return (
            <MiniPiano
                highlightedNotes={notes}
                rootNote={match.slashPitchClass !== undefined ? Math.min(...Array.from(notes)) : undefined}
                className={className}
            />
        );
    };

    return (
        <div
            className={classNames(
                "fixed inset-0 !z-[1000] flex justify-center bg-black/60 sm:p-4",
                isClosing ? "backdrop-fade-out pointer-events-none" : "backdrop-fade-in"
            )}
            onPointerDown={(e) => { pressStartedOnBackdrop.current = e.target === e.currentTarget; }}
            onClick={(e) => {
                if (pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose();
                pressStartedOnBackdrop.current = false;
            }}
        >
            <div className={classNames(
                "mcb-panel overflow-hidden w-full max-w-3xl h-full flex flex-col max-sm:!rounded-none",
                isClosing ? "animate-out" : "animate-in"
            )}>
                <div className="mcb-panel-header flex-shrink-0 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <MusicalNoteIcon className="w-4 h-4 flex-shrink-0 text-[var(--mcb-accent-text-primary)]" />
                        <h2 className="mcb-panel-title">Find by Notes</h2>
                        <span className="mcb-inset px-1.5 py-0.5 font-mono text-[0.6875rem] text-mcb-secondary truncate">
                            {currentKey} {currentMode}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Piano & selection (max half the height) */}
                <div className="flex-shrink-0 flex flex-col p-3 sm:p-4 gap-2">
                    <div className="mcb-inset p-1.5 sm:p-2">
                        <TogglePiano
                            selectedNotes={selectedNotes}
                            rootNote={bassNote}
                            onToggleNote={toggleNote}
                            getNoteName={getNoteDisplayName}
                            octaves={3}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-shrink-0 min-h-8">
                        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                            <span className="mcb-label mr-1">Notes</span>
                            {sortedSelectedNotes.length === 0 ? (
                                <span className="text-xs text-mcb-tertiary">Click keys to select notes</span>
                            ) : (
                                sortedSelectedNotes.map((noteIdx, idx) => (
                                    <button
                                        key={noteIdx}
                                        onClick={() => toggleNote(noteIdx)}
                                        className={classNames(
                                            "group inline-flex items-center gap-1 h-6 px-1.5 text-xs rounded-sm font-mono border transition-colors",
                                            idx === 0
                                                ? "bg-[var(--mcb-warning-primary)] border-[var(--mcb-warning-border)] text-[var(--mcb-warning-text)]"
                                                : "bg-[color-mix(in_srgb,var(--mcb-accent-primary)_16%,var(--mcb-bg-input))] border-[color-mix(in_srgb,var(--mcb-accent-primary)_50%,transparent)] text-[var(--mcb-accent-text-secondary)]"
                                        )}
                                        title={idx === 0 ? "Bass note (click to remove)" : "Click to remove"}
                                    >
                                        {getNoteDisplayName(noteIdx)}
                                        <XMarkIcon className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                    </button>
                                ))
                            )}
                        </div>
                        {sortedSelectedNotes.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {onPlayNotes && (
                                    <button
                                        onClick={() => onPlayNotes(selectedNotesString)}
                                        className={classNames(keyClass, "border-mcb-subtle text-mcb-secondary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)]")}
                                        title="Preview selected notes"
                                    >
                                        <PlayIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={clearSelection}
                                    className="h-8 px-3 rounded-md border border-mcb-subtle text-[0.625rem] uppercase tracking-wider text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 min-h-0 flex flex-col border-t border-mcb-subtle">
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 flex-shrink-0 bg-[color-mix(in_srgb,var(--mcb-bg-input)_30%,transparent)] border-b border-mcb-subtle">
                        <h3 className="mcb-panel-title">Matching Chords</h3>
                        {isLoading ? (
                            <span className="text-xs text-mcb-tertiary">Loading…</span>
                        ) : matchingChords.length > 0 && (
                            <span className="font-mono text-xs text-mcb-tertiary">{matchingChords.length}</span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-1.5">
                        {isLoading ? (
                            <div className="text-center py-8 text-sm text-mcb-tertiary">
                                Generating all chord combinations…
                            </div>
                        ) : sortedSelectedNotes.length === 0 ? (
                            <div className="text-center py-8 text-sm text-mcb-tertiary">
                                Select notes on the piano to find matching chords
                            </div>
                        ) : matchingChords.length === 0 ? (
                            <div className="text-center py-8 text-sm text-mcb-tertiary">
                                No matching chords found
                            </div>
                        ) : (
                            matchingChords.map((match, idx) => (
                                <div
                                    key={`${match.chord.chordName}-${match.slashNote || ''}-${idx}`}
                                    className="mcb-pad flex items-center gap-3 px-2.5 py-2"
                                >
                                    {onPlayNotes && (
                                        <button
                                            onClick={(e) => handlePlayChord(e, match)}
                                            className={classNames(keyClass, "border-mcb-subtle text-mcb-secondary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)]")}
                                            title="Preview chord"
                                        >
                                            <PlayIcon className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {renderMiniPiano(match, "hidden sm:block")}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-semibold text-base text-[var(--mcb-text-primary)]">
                                                {match.chord.chordName}
                                                {match.slashNote && (
                                                    <span className="text-[var(--mcb-warning-text)]">/{match.slashNote}</span>
                                                )}
                                            </span>
                                            {match.matchType === 'exact' && (
                                                <span className="mcb-label px-1.5 py-0.5 rounded-sm border border-[color-mix(in_srgb,var(--mcb-accent-primary)_50%,transparent)] !text-[var(--mcb-accent-text-secondary)]">
                                                    Root pos.
                                                </span>
                                            )}
                                            {match.matchType === 'with-slash' && (
                                                <span className="mcb-label px-1.5 py-0.5 rounded-sm border border-[var(--mcb-warning-border)] !text-[var(--mcb-warning-text)]">
                                                    Slash
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {renderMiniPiano(match, "sm:hidden")}
                                            <span className="text-xs text-mcb-tertiary font-mono truncate">
                                                {match.chord.chordNoteNames}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleSelectChord(e, match)}
                                        className="h-8 px-2.5 flex-shrink-0 inline-flex items-center justify-center gap-1 rounded-md border text-[0.625rem] uppercase tracking-wider font-semibold transition-colors bg-[color-mix(in_srgb,var(--mcb-success-primary)_16%,var(--mcb-bg-input))] border-[color-mix(in_srgb,var(--mcb-success-primary)_55%,transparent)] text-[var(--mcb-success-text)] hover:bg-[color-mix(in_srgb,var(--mcb-success-primary)_28%,var(--mcb-bg-input))]"
                                        title="Add chord to progression"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>Add</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChordFinderModal;