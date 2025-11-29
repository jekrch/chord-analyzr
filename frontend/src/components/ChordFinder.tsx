import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { XMarkIcon, MusicalNoteIcon, SparklesIcon, PlayIcon, PlusCircleIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { dynamicChordGenerator } from '../services/DynamicChordService';
import { staticDataService } from '../services/StaticDataService';
import { ModeScaleChordDto, ScaleNoteDto } from '../api';
import { Button } from './Button';
import { noteNameToNumber } from '../util/NoteUtil';

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

interface MiniPianoProps {
    highlightedNotes: Set<number>;
    className?: string;
}

const MiniPiano: React.FC<MiniPianoProps> = ({ highlightedNotes, className }) => {
    const whiteKeyPitchClasses = [0, 2, 4, 5, 7, 9, 11];
    const blackKeyConfig = [
        { pc: 1, leftPercent: 11.5 },
        { pc: 3, leftPercent: 25 },
        { pc: 6, leftPercent: 53.5 },
        { pc: 8, leftPercent: 67.5 },
        { pc: 10, leftPercent: 81.5 },
    ];

    const notesArray = Array.from(highlightedNotes);
    const maxNoteIndex = notesArray.length > 0 ? Math.max(...notesArray) : 11;
    const octaves = Math.max(1, Math.floor(maxNoteIndex / 12) + 1);
    
    const octaveWidthPercent = 100 / octaves;
    const blackKeyWidth = octaveWidthPercent * 0.085;
    const pianoWidth = octaves * 60;

    return (
        <div className={classNames("relative h-8 flex-shrink-0", className)} style={{ width: `${pianoWidth}px` }}>
            <div className="absolute inset-0 flex">
                {Array.from({ length: octaves }).map((_, octaveIdx) => (
                    <div key={octaveIdx} className="flex flex-1">
                        {whiteKeyPitchClasses.map((pc) => {
                            const noteIndex = octaveIdx * 12 + pc;
                            return (
                                <div
                                    key={`${octaveIdx}-${pc}`}
                                    className={classNames(
                                        "flex-1 border-r last:border-r-0 border-gray-400 rounded-b-sm",
                                        highlightedNotes.has(noteIndex)
                                            ? "bg-[var(--mcb-accent-primary)]"
                                            : "bg-gray-100"
                                    )}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            {Array.from({ length: octaves }).map((_, octaveIdx) => (
                <React.Fragment key={`black-${octaveIdx}`}>
                    {blackKeyConfig.map(({ pc, leftPercent }) => {
                        const noteIndex = octaveIdx * 12 + pc;
                        const leftPos = (octaveIdx * octaveWidthPercent) + (leftPercent * octaveWidthPercent / 100);
                        return (
                            <div
                                key={`${octaveIdx}-${pc}`}
                                style={{ left: `${leftPos}%`, width: `${blackKeyWidth}%` }}
                                className={classNames(
                                    "absolute top-0 h-[58%] rounded-b-sm",
                                    highlightedNotes.has(noteIndex)
                                        ? "bg-[var(--mcb-accent-tertiary)]"
                                        : "bg-gray-800"
                                )}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
};

interface TogglePianoProps {
    selectedNotes: Set<number>;
    onToggleNote: (noteIndex: number) => void;
    octaves?: number;
}

const TogglePiano: React.FC<TogglePianoProps> = ({ selectedNotes, onToggleNote, octaves = 3 }) => {
    const whiteKeyPitchClasses = [0, 2, 4, 5, 7, 9, 11];
    
    const blackKeyConfig = [
        { pc: 1, leftPercent: 11.5 },
        { pc: 3, leftPercent: 25 },
        { pc: 6, leftPercent: 53.5 },
        { pc: 8, leftPercent: 67.5 },
        { pc: 10, leftPercent: 81.5 },
    ];

    const octaveWidthPercent = 100 / octaves;
    const blackKeyWidth = octaveWidthPercent * 0.1;
    const minWidth = octaves * 280;

    return (
        <div className="overflow-x-auto">
            <div className="relative h-36 sm:h-44 select-none" style={{ minWidth: `${minWidth}px` }}>
                <div className="absolute inset-0 flex">
                    {Array.from({ length: octaves }).map((_, octaveIdx) => (
                        <div key={octaveIdx} className="flex flex-1 gap-[1px]">
                            {whiteKeyPitchClasses.map((pc) => {
                                const noteIndex = octaveIdx * 12 + pc;
                                const isSelected = selectedNotes.has(noteIndex);
                                return (
                                    <button
                                        key={noteIndex}
                                        onClick={() => onToggleNote(noteIndex)}
                                        className={classNames(
                                            "flex-1 h-full rounded-b-md transition-all duration-100",
                                            "border-x border-b focus:outline-none",
                                            isSelected
                                                ? "bg-gradient-to-b from-[var(--mcb-accent-primary)] to-[var(--mcb-accent-secondary)] border-[var(--mcb-accent-secondary)] shadow-md"
                                                : "bg-gradient-to-b from-white to-gray-100 border-gray-300 hover:from-gray-50 hover:to-gray-200"
                                        )}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>

                {Array.from({ length: octaves }).map((_, octaveIdx) => (
                    <React.Fragment key={`black-${octaveIdx}`}>
                        {blackKeyConfig.map(({ pc, leftPercent }) => {
                            const noteIndex = octaveIdx * 12 + pc;
                            const isSelected = selectedNotes.has(noteIndex);
                            const leftPos = (octaveIdx * octaveWidthPercent) + (leftPercent * octaveWidthPercent / 100);
                            return (
                                <button
                                    key={noteIndex}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleNote(noteIndex);
                                    }}
                                    style={{ left: `${leftPos}%`, width: `${blackKeyWidth}%` }}
                                    className={classNames(
                                        "absolute top-0 h-[58%] rounded-b-md transition-all duration-100 z-10",
                                        "border border-gray-900 focus:outline-none",
                                        isSelected
                                            ? "bg-gradient-to-b from-[var(--mcb-accent-tertiary)] to-[var(--mcb-accent-subtle)] shadow-md"
                                            : "bg-gradient-to-b from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800"
                                    )}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
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
            const noteNum = noteNameToNumber(note.noteName);
            return ((noteNum % 12) + 12) % 12 === normalizedPitchClass;
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

    useEffect(() => {
        if (!isOpen) {
            setSelectedNotes(new Set());
        }
    }, [isOpen]);

    const getChordPitchClasses = useCallback((chord: ModeScaleChordDto): Set<number> => {
        if (!chord.chordNoteNames) return new Set();
        const noteNames = chord.chordNoteNames.split(',').map(n => n.trim());
        const pitchClasses = new Set<number>();

        for (const name of noteNames) {
            try {
                const noteNum = noteNameToNumber(name);
                pitchClasses.add(((noteNum % 12) + 12) % 12);
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
                    const chordRootPitchClass = chordNoteNames[0]
                        ? ((noteNameToNumber(chordNoteNames[0]) % 12) + 12) % 12
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
                const baseMidi = noteNameToNumber(name);
                const pitchClass = ((baseMidi % 12) + 12) % 12;
                
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-mcb-input bg-opacity-95 backdrop-blur-sm z-[1000] flex flex-col">
            {/* Upper Section - Piano & Selection (max 50% height) */}
            <div className="flex-shrink-0 max-h-[50vh] flex flex-col">
                <div className="max-w-3xl mx-auto px-4 pt-4 pb-2 w-full flex-shrink-0">
                    <div className="flex items-center justify-between mb-0">
                        <div className="flex items-center space-x-2">
                            <MusicalNoteIcon className="w-5 h-5 text-[var(--mcb-accent-primary)]" />
                            <h2 className="text-base sm:text-lg font-bold text-white">Chord Finder</h2>
                            <span className="text-xs text-mcb-tertiary">({currentKey} {currentMode})</span>
                        </div>
                        <Button onClick={onClose} variant="secondary" size="sm">
                            <XMarkIcon className="w-5 h-5" />
                        </Button>
                    </div>

                    <p className="text-xs text-mcb-tertiary mb-0">
                        Click keys to select notes.
                    </p>
                </div>

                {/* Piano - scrollable if needed */}
                <div className="max-w-3xl mx-auto px-4 w-full flex-1 min-h-0 overflow-y-auto">
                    <div className="bg-mcb-primary rounded-lg border border-mcb-primary p-2 sm:p-3">
                        <TogglePiano
                            selectedNotes={selectedNotes}
                            onToggleNote={toggleNote}
                            octaves={3}
                        />
                    </div>
                </div>

                {/* Selected Notes - always visible at bottom of upper section */}
                <div className="max-w-3xl mx-auto px-4 py-2 w-full flex-shrink-0 bg-mcb-input">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                            <span className="text-xs text-mcb-secondary font-medium">Selected:</span>
                            {sortedSelectedNotes.length === 0 ? (
                                <span className="text-xs text-mcb-tertiary italic">None</span>
                            ) : (
                                sortedSelectedNotes.map((noteIdx, idx) => (
                                    <button
                                        key={noteIdx}
                                        onClick={() => toggleNote(noteIdx)}
                                        className={classNames(
                                            "px-1.5 py-0.5 text-xs text-white rounded font-mono transition-colors",
                                            idx === 0
                                                ? "bg-amber-600 hover:bg-amber-500"
                                                : "bg-[var(--mcb-accent-primary)] hover:bg-[var(--mcb-accent-secondary)]"
                                        )}
                                        title={idx === 0 ? "Root note (click to remove)" : "Click to remove"}
                                    >
                                        {getNoteDisplayName(noteIdx)}
                                        {idx === 0 && <span className="ml-0.5 opacity-75">♪</span>}
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {sortedSelectedNotes.length > 0 && onPlayNotes && (
                                <Button
                                    onClick={() => onPlayNotes(selectedNotesString)}
                                    variant="secondary"
                                    size="sm"
                                    className="bg-[var(--mcb-accent-secondary)] hover:bg-[var(--mcb-accent-tertiary)] text-white !px-2 !py-1"
                                    title="Preview selected notes"
                                >
                                    <PlayIcon className="w-3.5 h-3.5" />
                                </Button>
                            )}
                            {sortedSelectedNotes.length > 0 && (
                                <Button onClick={clearSelection} variant="secondary" size="sm" className="!px-2 !py-1 text-xs">
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results - fills remaining space */}
            <div className="flex-1 max-w-3xl mx-auto px-4 w-full overflow-hidden flex flex-col min-h-0">
                <div className="bg-mcb-primary rounded-lg border border-mcb-primary p-4 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-white">
                            Matching Chords
                            {matchingChords.length > 0 && (
                                <span className="ml-2 text-sm text-mcb-tertiary">({matchingChords.length})</span>
                            )}
                        </h3>
                        {isLoading && <span className="text-xs text-mcb-tertiary">Loading...</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {isLoading ? (
                            <div className="text-center py-8 text-mcb-tertiary">
                                Generating all chord combinations...
                            </div>
                        ) : sortedSelectedNotes.length === 0 ? (
                            <div className="text-center py-8 text-mcb-tertiary text-lg">
                                Select notes on the piano to find matching chords
                            </div>
                        ) : matchingChords.length === 0 ? (
                            <div className="text-center py-8 text-mcb-tertiary">
                                No matching chords found
                            </div>
                        ) : (
                            matchingChords.map((match, idx) => (
                                <div
                                    key={`${match.chord.chordName}-${match.slashNote || ''}-${idx}`}
                                    className={classNames(
                                        "w-full text-left p-3 rounded border transition-all",
                                        "hover:border-[var(--mcb-accent-primary)] hover:bg-mcb-hover",
                                        match.matchType === 'exact'
                                            ? "bg-[var(--mcb-accent-primary)]/10 border-[var(--mcb-accent-primary)]/50"
                                            : "bg-mcb-input border-mcb-primary"
                                    )}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {onPlayNotes && (
                                                <button
                                                    onClick={(e) => handlePlayChord(e, match)}
                                                    className="p-1.5 rounded bg-[var(--mcb-accent-secondary)] hover:bg-[var(--mcb-accent-tertiary)] text-white transition-colors"
                                                    title="Preview chord"
                                                >
                                                    <PlayIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <MiniPiano
                                                highlightedNotes={getChordNoteIndices(match.chord, match.slashPitchClass)}
                                            />
                                            <button
                                                onClick={(e) => handleSelectChord(e, match)}
                                                className="p-1.5 rounded bg-[var(--mcb-success-primary)] hover:bg-[var(--mcb-success-secondary)] text-white transition-colors"
                                                title="Add chord to progression"
                                            >
                                                <PlusCircleIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center space-x-2 flex-wrap">
                                                <span className="text-white font-semibold text-lg">
                                                    {match.chord.chordName}
                                                    {match.slashNote && (
                                                        <span className="text-amber-400">/{match.slashNote}</span>
                                                    )}
                                                </span>
                                                {match.matchType === 'exact' && (
                                                    <span className="flex items-center space-x-1 px-2 py-0.5 text-xs bg-[var(--mcb-accent-primary)] text-white rounded">
                                                        <SparklesIcon className="w-3 h-3" />
                                                        <span>Root</span>
                                                    </span>
                                                )}
                                                {match.matchType === 'with-slash' && (
                                                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                                        Slash
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-mcb-tertiary font-mono truncate block">
                                                {match.chord.chordNoteNames}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 h-4"></div>
        </div>
    );
};

export default ChordFinderModal;