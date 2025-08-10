import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { PlayCircleIcon, TrashIcon, XCircleIcon } from '@heroicons/react/20/solid';
import { MidiNumbers } from 'react-piano';
import classNames from 'classnames';
import { ModeScaleChordDto, ScaleNoteDto } from './api';
import { dataService } from './services/DataService';
import { useModes } from './hooks/useModes';
import { getMidiNotes } from './util/ChordUtil';
import { normalizeNoteName } from './util/NoteUtil';
import ChordTable from './components/ChordTable';
import Dropdown from './components/Dropdown';
import PianoControl from './components/piano/PianoControl';
import TextInput from './components/TextInput';
import PatternSystem from './components/PatternSystem';
import './App.css';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

// Types
interface AddedChord {
    name: string;
    notes: string;
}

export interface ActiveNoteInfo {
    note: string;
    octave: number;
}

interface ChordPattern {
    pattern: string[];
    enabled: boolean;
}

interface GlobalPatternState {
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}

function App() {
    // ========== STATE MANAGEMENT ==========

    // Core music data
    const [chords, setChords] = useState<ModeScaleChordDto[]>();
    const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
    const [key, setKey] = useState<string>('C');
    const [mode, setMode] = useState<string>('Ionian');
    const { modes } = useModes();

    // Playback state
    const [activeNotes, setActiveNotes] = useState<ActiveNoteInfo[]>([]);
    const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
    const [highlightedChordIndex, setHighlightedChordIndex] = useState<number | null>(null);
    const [addedChords, setAddedChords] = useState<AddedChord[]>([]);

    // UI state
    const [loadingChords, setLoadingChords] = useState<boolean>(false);
    const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
    const [isPlayingScale, setIsPlayingScale] = useState<boolean>(false);
    const [showPatternSystem, setShowPatternSystem] = useState(false);

    // Pattern sequencer state
    const [globalPatternState, setGlobalPatternState] = useState<GlobalPatternState>({
        defaultPattern: ['1', '2', '3', '4'],
        chordPatterns: {},
        isPlaying: false,
        bpm: 120,
        subdivision: 0.25, // 16th notes by default
        swing: 0,
        currentStep: 0,
        repeat: true,
        lastChordChangeTime: 0,
        globalClockStartTime: 0,
    });

    // ========== SEQUENCER TIMING (STEADY GLOBAL CLOCK) ==========

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const globalStepRef = useRef<number>(0);
    const sequencerStartTimeRef = useRef<number>(0);

    // Calculate timing values
    const stepDuration = useMemo(() => {
        const quarterNoteDuration = 60000 / globalPatternState.bpm;
        return quarterNoteDuration * globalPatternState.subdivision;
    }, [globalPatternState.bpm, globalPatternState.subdivision]);

    const getSwingDuration = useCallback((stepIndex: number) => {
        if (globalPatternState.swing === 0) return stepDuration;
        const isOffBeat = stepIndex % 2 === 1;
        const swingRatio = 1 + (globalPatternState.swing / 100);
        return isOffBeat ? stepDuration * swingRatio : stepDuration / swingRatio;
    }, [stepDuration, globalPatternState.swing]);

    // Get current active pattern
    const getCurrentPattern = useCallback(() => {
        if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
            return globalPatternState.chordPatterns[activeChordIndex].pattern;
        }
        return globalPatternState.defaultPattern;
    }, [activeChordIndex, globalPatternState.chordPatterns, globalPatternState.defaultPattern]);

    // Steady global clock - NEVER resets when changing chords
    useEffect(() => {
        if (globalPatternState.isPlaying) {
            if (!intervalRef.current) {
                // Initialize steady clock
                sequencerStartTimeRef.current = Date.now();
                globalStepRef.current = 0;

                // Set initial step in state
                setGlobalPatternState(prev => ({
                    ...prev,
                    currentStep: 0
                }));

                const tick = () => {
                    const now = Date.now();
                    const elapsed = now - sequencerStartTimeRef.current;

                    // Calculate expected step with precise timing (no swing for step calculation)
                    const expectedStep = Math.floor(elapsed / stepDuration);

                    // Only advance if we've reached the next step
                    if (expectedStep > globalStepRef.current) {
                        globalStepRef.current = expectedStep;

                        // Update UI step counter (only when step actually changes)
                        setGlobalPatternState(prev => ({
                            ...prev,
                            currentStep: expectedStep
                        }));
                    }

                    // Schedule next tick with high precision - check every 10ms for tight timing
                    intervalRef.current = setTimeout(tick, 10);
                };

                // Start the tick cycle
                tick();
            }
        } else {
            // Stop the clock but keep the step position
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
                intervalRef.current = null;
            }
            // Don't reset globalStepRef - keep clock position for smooth restart
        }

        return () => {
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [globalPatternState.isPlaying, stepDuration]);

    // Keep activeNotes as full chord when sequencer is playing  
    useEffect(() => {
        if (globalPatternState.isPlaying && activeChordIndex !== null && addedChords[activeChordIndex]) {
            const currentChord = addedChords[activeChordIndex];
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
            setActiveNotes(notesWithOctaves as ActiveNoteInfo[]);
        }
    }, [globalPatternState.isPlaying, activeChordIndex, addedChords]);

    // ========== COMPUTED VALUES ==========

    const normalizedScaleNotes: string[] = useMemo(() => {
        if (!scaleNotes) return [];
        return scaleNotes
            .map(scaleNote => scaleNote.noteName ? normalizeNoteName(scaleNote.noteName) : null)
            .filter(Boolean) as string[];
    }, [scaleNotes]);

    // ========== CORE FUNCTIONALITY ==========

    const playNotes = useCallback((notes: ActiveNoteInfo[]) => {
        // Clear any existing notes first
        setActiveNotes([]);
        // Then set the new notes after a small delay to ensure the effect triggers
        setTimeout(() => setActiveNotes(notes), 10);
    }, []);

// Add this new state to your App component (near the other state declarations):
const [temporaryChord, setTemporaryChord] = useState<{ name: string; notes: string } | null>(null);

// Updated handleChordClick function:
const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
    if (isDeleteMode && chordIndex !== undefined) {
        removeChord(chordIndex);
        return;
    }

    const notesWithOctaves = getMidiNotes(
        START_OCTAVE, END_OCTAVE, chordNoteNames
    );

    // If chordIndex is provided (clicked from bottom nav), use that chord
    if (chordIndex !== undefined) {
        // Clear any temporary chord when clicking from bottom nav
        setTemporaryChord(null);
        setActiveChordIndex(chordIndex);
        
        // If sequencer is not playing, play the chord immediately
        if (!globalPatternState.isPlaying) {
            playNotes(notesWithOctaves as ActiveNoteInfo[]);
        }
        
        // Update highlighted chord for visual feedback
        setHighlightedChordIndex(chordIndex);
        setTimeout(() => setHighlightedChordIndex(null), 150);
    } else {
        // Clicked from chord table - use as temporary chord for sequencer
        if (chordName) {
            setTemporaryChord({ name: chordName, notes: chordNoteNames });
            setActiveChordIndex(null); // Clear active chord index since we're using temporary
        }
        
        // If sequencer is not playing, play the chord immediately
        if (!globalPatternState.isPlaying) {
            playNotes(notesWithOctaves as ActiveNoteInfo[]);
        }
    }
}, [playNotes, globalPatternState.isPlaying, isDeleteMode]);

// Update the effect that keeps activeNotes in sync with sequencer:
useEffect(() => {
    if (globalPatternState.isPlaying) {
        let currentChord = null;
        
        // Use temporary chord if it exists, otherwise use chord from sequence
        if (temporaryChord) {
            currentChord = temporaryChord;
        } else if (activeChordIndex !== null && addedChords[activeChordIndex]) {
            currentChord = addedChords[activeChordIndex];
        }
        
        if (currentChord) {
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
            setActiveNotes(notesWithOctaves as ActiveNoteInfo[]);
        }
    }
}, [globalPatternState.isPlaying, activeChordIndex, addedChords, temporaryChord]);

// Update the playback status display to show temporary chord:
{globalPatternState.isPlaying && (
    <div className="px-6 py-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
        <div className="text-sm text-green-300 flex items-center justify-center space-x-4">
            <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="font-medium">Sequencer Active</span>
            </div>
            <div className="text-xs opacity-80">
                Pattern: {getCurrentPattern().join('-')} | 
                {globalPatternState.bpm} BPM | 
                Step {(globalPatternState.currentStep % getCurrentPattern().length) + 1}/{getCurrentPattern().length}
                {temporaryChord && 
                    <span className="ml-2 text-yellow-300">• {temporaryChord.name} (temporary)</span>
                }
                {!temporaryChord && activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled && 
                    <span className="ml-2 text-purple-300">• {addedChords[activeChordIndex]?.name}</span>
                }
                {!temporaryChord && activeChordIndex !== null && !globalPatternState.chordPatterns[activeChordIndex]?.enabled &&
                    <span className="ml-2 text-cyan-300">• {addedChords[activeChordIndex]?.name}</span>
                }
            </div>
        </div>
    </div>
)}

// Update the keyboard handler to clear temporary chord when switching to sequence chords:
const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) return;

    if (event.key.toLowerCase() === 'p') {
        setShowPatternSystem(prev => !prev);
        return;
    }

    if (event.key === ' ') {
        event.preventDefault();
        const newIsPlaying = !globalPatternState.isPlaying;
        setGlobalPatternState(prev => ({
            ...prev,
            isPlaying: newIsPlaying,
        }));
        
        // Reset timing when starting
        if (newIsPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
        }
        return;
    }

    const keyMapIndex = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
    if (!isNaN(keyMapIndex) && keyMapIndex >= 0 && keyMapIndex < addedChords.length) {
        const chordToPlay = addedChords[keyMapIndex];
        if (chordToPlay) {
            // Clear temporary chord when using keyboard shortcuts for sequence chords
            setTemporaryChord(null);
            handleChordClick(chordToPlay.notes, keyMapIndex);
        }
    }
}, [addedChords, handleChordClick, globalPatternState.isPlaying]);
    const addChordClick = useCallback((chordName: string, chordNotes: string) => {
        setAddedChords(current => [...current, { name: chordName, notes: chordNotes }]);
    }, []);

    const removeChord = useCallback((indexToRemove: number) => {
        setAddedChords(current => current.filter((_, index) => index !== indexToRemove));

        // Clean up chord patterns when chord is removed
        const newChordPatterns = { ...globalPatternState.chordPatterns };
        delete newChordPatterns[indexToRemove];

        // Reindex remaining patterns
        const reindexedPatterns: { [key: number]: ChordPattern } = {};
        Object.entries(newChordPatterns).forEach(([key, value]) => {
            const oldIndex = parseInt(key);
            if (oldIndex > indexToRemove) {
                reindexedPatterns[oldIndex - 1] = value;
            } else {
                reindexedPatterns[oldIndex] = value;
            }
        });

        setGlobalPatternState(prev => ({
            ...prev,
            chordPatterns: reindexedPatterns
        }));

        // Reset active chord if it was removed
        if (activeChordIndex === indexToRemove) {
            setActiveChordIndex(null);
        } else if (activeChordIndex !== null && activeChordIndex > indexToRemove) {
            setActiveChordIndex(activeChordIndex - 1);
        }
    }, [globalPatternState.chordPatterns, activeChordIndex]);

    const clearAllChords = useCallback(() => {
        setAddedChords([]);
        setGlobalPatternState(prev => ({ ...prev, chordPatterns: {}, isPlaying: false }));
        setActiveChordIndex(null);
    }, []);

    const playScaleNotes = useCallback(() => {
        if (!scaleNotes?.length || isPlayingScale) {
            return;
        }

        setIsPlayingScale(true);

        // Stop sequencer if it's running
        const wasPlaying = globalPatternState.isPlaying;
        if (wasPlaying) {
            setGlobalPatternState(prev => ({ ...prev, isPlaying: false }));
        }

        // Clear any active notes first
        setActiveNotes([]);

        const noteDuration = 400;
        let cumulativeDelay = 100;
        let currentOctave = 4;
        let lastMidiNumber = 0;

        // Create scale with tonic at the end
        const scaleNotesWithTonic = [...scaleNotes];
        if (scaleNotes[0]?.noteName) {
            scaleNotesWithTonic.push({ noteName: scaleNotes[0].noteName });
        }

        scaleNotesWithTonic.forEach((scaleNote, index) => {
            if (!scaleNote.noteName) return;

            setTimeout(() => {
                const noteName = normalizeNoteName(scaleNote.noteName);
                if (!noteName) return;

                let midiNumber = MidiNumbers.fromNote(noteName + currentOctave);

                if (index > 0 && midiNumber <= lastMidiNumber) {
                    currentOctave++;
                    midiNumber = MidiNumbers.fromNote(noteName + currentOctave);
                }

                lastMidiNumber = midiNumber;
                const noteDetails = MidiNumbers.getAttributes(midiNumber);
                const note = noteDetails.note.slice(0, -1);
                const octave = parseInt(noteDetails.note.slice(-1), 10);

                setActiveNotes([{ note, octave }]);
            }, cumulativeDelay);

            cumulativeDelay += noteDuration;
        });

        // Clear notes and restore sequencer state after scale finishes
        setTimeout(() => {
            setActiveNotes([]);
            setIsPlayingScale(false);
            if (wasPlaying) {
                setGlobalPatternState(prev => ({ ...prev, isPlaying: true }));
            }
        }, cumulativeDelay + noteDuration);
    }, [scaleNotes, globalPatternState.isPlaying, isPlayingScale]);

    // ========== EVENT HANDLERS ==========

    const handlePatternChange = useCallback((newPatternState: Partial<GlobalPatternState>) => {
        setGlobalPatternState(prev => ({
            ...prev,
            ...newPatternState,
        }));

        // If we're starting playback, reset timing
        if (newPatternState.hasOwnProperty('isPlaying') && newPatternState.isPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
        }

        // If we're manually resetting the step, reset the sequencer timing too
        if (newPatternState.hasOwnProperty('currentStep') && newPatternState.currentStep === 0) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
        }
    }, []);

    // ========== EFFECTS ==========

    // Fetch chords and scale notes when key/mode changes
    useEffect(() => {
        if (!key) return;
        setLoadingChords(true);
        setChords([]);

        Promise.all([
            dataService.getModeKeyChords(key, mode),
            dataService.getScaleNotes(key, mode)
        ])
            .then(([chordsData, scaleData]) => {
                setChords(chordsData);
                setScaleNotes(scaleData);
            })
            .catch(err => console.error('Error fetching music data:', err))
            .finally(() => setLoadingChords(false));
    }, [key, mode]);

    // Keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    // ========== RENDER ==========

    return (
        <div className="text-center bg-[#282c34] min-h-screen pb-24"> {/* Added padding bottom for fixed chord nav */}
            <div className="flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6">

                {/* Header Controls */}
                <div className="flex items-center justify-center space-x-6 pt-6">
                    <button
                        onClick={() => setShowPatternSystem(!showPatternSystem)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${showPatternSystem
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                    >
                        {showPatternSystem ? 'Hide' : 'Show'} Sequencer
                    </button>

                    <div className="text-xs text-gray-400 text-center">
                        <div>Press 'P' to toggle | Space to play/pause</div>
                        <div>1-9 for chords | Colored border = active chord | Purple = custom pattern</div>
                    </div>
                </div>

                {/* Piano */}
                <div className="w-full max-w-4xl">
                    <PianoControl
                        activeNotes={activeNotes}
                        normalizedScaleNotes={normalizedScaleNotes}
                        globalPatternState={globalPatternState as any}
                        onPatternStateChange={handlePatternChange}
                        activeChordIndex={activeChordIndex}
                        addedChords={addedChords}
                    />
                </div>

                {/* Pattern System - Conditional Rendering */}
                {showPatternSystem && (
                    <div className="w-full">
                        <PatternSystem
                            activeNotes={activeNotes}
                            normalizedScaleNotes={normalizedScaleNotes}
                            addedChords={addedChords}
                            activeChordIndex={activeChordIndex}
                            onPatternChange={handlePatternChange}
                            globalPatternState={globalPatternState}
                            getCurrentPattern={getCurrentPattern}
                        />
                    </div>
                )}

                {/* Playback Status */}
                {globalPatternState.isPlaying && (
                    <div className="px-6 py-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                        <div className="text-sm text-green-300 flex items-center justify-center space-x-4">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                <span className="font-medium">Sequencer Active</span>
                            </div>
                            <div className="text-xs opacity-80">
                                Pattern: {getCurrentPattern().join('-')} |
                                {globalPatternState.bpm} BPM |
                                Step {(globalPatternState.currentStep % getCurrentPattern().length) + 1}/{getCurrentPattern().length}
                                {activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled &&
                                    <span className="ml-2 text-purple-300">• {addedChords[activeChordIndex]?.name}</span>
                                }
                                {activeChordIndex !== null && !globalPatternState.chordPatterns[activeChordIndex]?.enabled &&
                                    <span className="ml-2 text-cyan-300">• {addedChords[activeChordIndex]?.name}</span>
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Key/Mode Controls */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <TextInput
                            label="Key"
                            value={key}
                            onChange={setKey}
                        />
                        <PlayCircleIcon
                            onClick={playScaleNotes}
                            height={30}
                            className={`inline-block ml-2 cursor-pointer transition-colors ${isPlayingScale
                                    ? 'text-green-400 animate-pulse cursor-not-allowed'
                                    : 'hover:text-slate-400 active:text-slate-500'
                                }`}
                            title={isPlayingScale ? 'Playing scale...' : 'Play scale'}
                        />
                    </div>

                    {modes && (
                        <Dropdown
                            value={mode}
                            className='w-auto min-w-[10em]'
                            menuClassName='min-w-[10em]'
                            onChange={setMode}
                            showSearch={true}
                            options={modes}
                        />
                    )}
                </div>

                {/* Chord Table */}
                <div className="w-full max-w-6xl mb-20">
                    <ChordTable
                        chords={chords?.filter(c => !!c.chordName && !!c.chordNoteNames) as any}
                        loading={loadingChords}
                        onChordClick={handleChordClick}
                        addChordClick={addChordClick}
                    />
                </div>
            </div>

            {/* Bottom Chord Navigation */}
            {addedChords.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#1e2329] border-t border-gray-600 shadow-2xl z-50">
                    <div className="max-w-7xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                Chord Sequence {activeChordIndex !== null
                                    //&& `• Playing: ${addedChords[activeChordIndex]?.name}`
                                }
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    className="text-xs bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded transition-colors"
                                    onClick={clearAllChords}
                                >
                                    Clear All
                                </button>
                                <button
                                    onClick={() => setIsDeleteMode(!isDeleteMode)}
                                    className={classNames('flex items-center gap-1 text-xs font-medium py-1 px-3 rounded transition-colors', {
                                        'bg-red-600 hover:bg-red-700 text-white': isDeleteMode,
                                        'bg-gray-600 hover:bg-gray-700 text-white': !isDeleteMode
                                    })}
                                >
                                    <TrashIcon className="h-3 w-3" />
                                    {isDeleteMode ? 'Done' : 'Delete'}
                                </button>
                            </div>
                        </div>

                        {/* Chord Buttons */}
                        <div className="flex space-x-2 overflow-x-auto pb-2 chord-sequence-scroll">
                            {addedChords.map((chord, index) => {
                                const hasCustomPattern = globalPatternState.chordPatterns[index]?.enabled;
                                const isActive = index === activeChordIndex;
                                const isHighlighted = index === highlightedChordIndex;

                                return (
                                    <button
                                        key={index}
                                        className={classNames(
                                            'flex-shrink-0 relative py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 min-w-[85px] bottom-nav-button chord-button m-2',
                                            {
                                                'bg-cyan-500 shadow-lg text-white ring-2 ring-cyan-300': isActive && !isDeleteMode,
                                                'bg-cyan-700 hover:bg-cyan-600 text-white': !isActive && !isDeleteMode && !hasCustomPattern,
                                                'bg-purple-700 hover:bg-purple-600 text-white': !isActive && !isDeleteMode && hasCustomPattern,
                                                'bg-red-700 hover:bg-red-600 text-white shadow-md': isDeleteMode,
                                                'transform': isHighlighted,
                                            }
                                        )}
                                        onClick={() => handleChordClick(chord.notes, index)}
                                    >
                                        {isDeleteMode && (
                                            <XCircleIcon className="absolute top-1 right-1 h-4 w-4 text-white bg-red-500 rounded-full shadow-sm" />
                                        )}
                                        {hasCustomPattern && !isDeleteMode && (
                                            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-sm"></div>
                                        )}
                                        <div className="text-xs text-cyan-200 font-bold mb-1">{index + 1}</div>
                                        <div className="text-xs leading-tight">{chord.name}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;