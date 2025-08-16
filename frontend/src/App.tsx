import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { PlayCircleIcon } from '@heroicons/react/20/solid';
import { MidiNumbers } from 'react-piano';
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
import ChordNavigation from './components/ChordNavigation';
import './App.css';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

// types
interface AddedChord {
    name: string;
    notes: string;
    pattern: string[]; // The pattern this chord was created with (editable)
}

export interface ActiveNoteInfo {
    note: string;
    octave: number;
}

interface GlobalPatternState {
    currentPattern: string[]; // The pattern currently active (used for table chords and new chord creation)
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}

// Helper function to check if current pattern step should play
const shouldPlayAtCurrentStep = (pattern: string[], stepIndex: number): boolean => {
    if (!pattern || pattern.length === 0) return true;

    const currentStepValue = pattern[stepIndex % pattern.length];

    // Only play if the step is not a rest ('x' or 'X')
    return currentStepValue !== 'x' && currentStepValue !== 'X';
};


const resolvePatternForPlayback = (
    temporaryChord: { name: string; notes: string } | null,
    activeChordIndex: number | null,
    addedChords: AddedChord[],
    currentlyActivePattern: string[]
): string[] => {
    // CASE 1: Table chord (temporary) - use currently active pattern
    if (temporaryChord) {
        return currentlyActivePattern;
    }

    // CASE 2: Added chord from sequence - use its stored pattern
    if (activeChordIndex !== null && addedChords[activeChordIndex]) {
        return addedChords[activeChordIndex].pattern;
    }

    // CASE 3: Fallback to currently active pattern
    return currentlyActivePattern;
};

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
    const [isLiveMode, setIsLiveMode] = useState<boolean>(false);

    // Pattern sequencer state
    const [globalPatternState, setGlobalPatternState] = useState<GlobalPatternState>({
        currentPattern: ['1', '2', '3', '4'], // Just one pattern - the current one
        isPlaying: false,
        bpm: 120,
        subdivision: 0.25, // 16th notes by default
        swing: 0,
        currentStep: 0,
        repeat: true,
        lastChordChangeTime: 0,
        globalClockStartTime: 0,
    });

    // Track the currently active pattern separately from chord selection
    const [currentlyActivePattern, setCurrentlyActivePattern] = useState<string[]>(['1', '2', '3', '4']);

    // Temporary chord state for sequencer
    const [temporaryChord, setTemporaryChord] = useState<{ name: string; notes: string } | null>(null);

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

    // Use pattern resolution for UI display
    const getCurrentPattern = useCallback(() => {
        return resolvePatternForPlayback(
            temporaryChord,
            activeChordIndex,
            addedChords,
            currentlyActivePattern
        );
    }, [temporaryChord, activeChordIndex, addedChords, currentlyActivePattern]);

    // this silent audio reference is used to prevent the mute function 
    // on iOS devices from blocking tonejs audio
    const silentAudioRef = useRef<HTMLAudioElement>(null)
    const audioInitializedRef = useRef(false)

    // audio initialization
    const initializeAudio = async () => {
        if (!audioInitializedRef.current) {
            try {
                // for ios, we need to play silent audio first
                await silentAudioRef.current?.play()

                audioInitializedRef.current = true

                // cleanup listeners after successful initialization
                document.removeEventListener('touchstart', initializeAudio)
                document.removeEventListener('mousedown', initializeAudio)
                document.removeEventListener('click', initializeAudio)
            } catch (error) {
                console.error('failed to initialize audio:', error)
            }
        }
    }

    useEffect(() => {
        // event listeners for user interaction
        document.addEventListener('touchstart', initializeAudio)
        document.addEventListener('mousedown', initializeAudio)
        document.addEventListener('click', initializeAudio)

        // cleanup event listeners on unmount
        return () => {
            document.removeEventListener('touchstart', initializeAudio)
            document.removeEventListener('mousedown', initializeAudio)
            document.removeEventListener('click', initializeAudio)
        }
    }, [])


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

    // Update currently active pattern when chord selection or global pattern changes
    useEffect(() => {
        if (activeChordIndex !== null && addedChords[activeChordIndex]) {
            // Use the selected chord's pattern
            setCurrentlyActivePattern([...addedChords[activeChordIndex].pattern]);
        } else {
            // Use the global current pattern
            setCurrentlyActivePattern([...globalPatternState.currentPattern]);
        }
    }, [activeChordIndex, addedChords, globalPatternState.currentPattern]);

    // Keep activeNotes in sync with sequencer using pattern resolution
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
                const currentPattern = resolvePatternForPlayback(
                    temporaryChord,
                    activeChordIndex,
                    addedChords,
                    currentlyActivePattern
                );

                const currentStepIndex = globalPatternState.currentStep % currentPattern.length;

                // Check if we should play at this step
                if (shouldPlayAtCurrentStep(currentPattern, currentStepIndex)) {
                    // Play the entire chord
                    const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
                    setActiveNotes(notesWithOctaves as ActiveNoteInfo[]);
                } else {
                    // Rest step - silence
                    setActiveNotes([]);
                }
            }
        }
    }, [
        globalPatternState.isPlaying,
        globalPatternState.currentStep,
        temporaryChord,
        activeChordIndex,
        addedChords,
        currentlyActivePattern // Updated dependency
    ]);

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
            }

            // If sequencer is not playing, play the chord immediately
            if (!globalPatternState.isPlaying) {
                playNotes(notesWithOctaves as ActiveNoteInfo[]);
            }
        }
    }, [playNotes, globalPatternState.isPlaying, isDeleteMode]);

    // Capture currently active pattern when adding chords
    const addChordClick = useCallback((chordName: string, chordNotes: string) => {
        setAddedChords(current => [...current, {
            name: chordName,
            notes: chordNotes,
            pattern: [...currentlyActivePattern] // Deep copy currently active pattern
        }]);
    }, [currentlyActivePattern]);

    const removeChord = useCallback((indexToRemove: number) => {
        setAddedChords(current => {
            const newChords = current.filter((_, index) => index !== indexToRemove);
            // Exit expanded mode if this was the last chord
            if (newChords.length === 0 && isLiveMode) {
                setIsLiveMode(false);
            }
            return newChords;
        });

        // Reset active chord if it was removed
        if (activeChordIndex === indexToRemove) {
            setActiveChordIndex(null);
        } else if (activeChordIndex !== null && activeChordIndex > indexToRemove) {
            setActiveChordIndex(activeChordIndex - 1);
        }
    }, [activeChordIndex, isLiveMode]);

    const clearAllChords = useCallback(() => {
        setAddedChords([]);
        setGlobalPatternState(prev => ({ ...prev, isPlaying: false }));
        setActiveChordIndex(null);
        setTemporaryChord(null);
        setIsLiveMode(false);
    }, []);

    // Callback to update individual chord patterns
    const updateChordPattern = useCallback((chordIndex: number, newPattern: string[]) => {
        setAddedChords(current => {
            const updated = [...current];
            updated[chordIndex] = { ...updated[chordIndex], pattern: [...newPattern] };
            return updated;
        });
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

    const handleTogglePlayback = useCallback(() => {
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
    }, [globalPatternState.isPlaying]);

    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key.toLowerCase() === 'p') {
            setShowPatternSystem(prev => !prev);
            return;
        }

        if (event.key.toLowerCase() === 'l') {
            setIsLiveMode(prev => !prev);
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
            <div className={`flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6 ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>

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
                        <div>Press 'P' to toggle | 'L' to expand </div>
                        <div>Space to play/pause | 1-9 for chords </div>
                    </div>
                </div>

                {/* Piano */}
                <div className="w-full max-w-7xl">
                    <PianoControl
                        activeNotes={activeNotes}
                        normalizedScaleNotes={normalizedScaleNotes}
                        globalPatternState={globalPatternState}
                        onPatternStateChange={handlePatternChange}
                        activeChordIndex={activeChordIndex}
                        addedChords={addedChords}
                        currentlyActivePattern={currentlyActivePattern}
                    />
                </div>

                {/* Pattern System with smooth animation */}
                <div className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${showPatternSystem ? 'opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                    <PatternSystem
                        activeNotes={activeNotes}
                        normalizedScaleNotes={normalizedScaleNotes}
                        addedChords={addedChords}
                        activeChordIndex={activeChordIndex}
                        onPatternChange={handlePatternChange}
                        onUpdateChordPattern={updateChordPattern}
                        globalPatternState={globalPatternState}
                        currentlyActivePattern={currentlyActivePattern}
                        getCurrentPattern={getCurrentPattern}
                    />
                </div>

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
                                {temporaryChord &&
                                    <span className="ml-2 text-yellow-300">• {temporaryChord.name} (table chord)</span>
                                }
                                {!temporaryChord && activeChordIndex !== null &&
                                    <span className="ml-2 text-purple-300">• {addedChords[activeChordIndex]?.name} (selected chord)</span>
                                }
                                {!temporaryChord && activeChordIndex === null &&
                                    <span className="ml-2 text-cyan-300">• Global pattern</span>
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Key/Mode Controls */}
                <div className="flex justify-center -mt-2 ">
                    <div className="bg-[#3d434f] bg-opacity-50 border border-gray-600 rounded-xl px-6 py-4 backdrop-blur-sm w-full max-w-7xl mx-auto px-2">
                        <div className="inline-grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center">
                            {/* Key Row */}
                            <div className="text-right">
                                <span className="text-sm text-slate-300 font-medium">Key:</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Dropdown
                                    value={key}
                                    className='w-[5rem]'
                                    buttonClassName='px-3 py-2 text-center font-medium'
                                    menuClassName='min-w-[5rem]'
                                    onChange={setKey}
                                    showSearch={false}
                                    options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                />
                                <button
                                    onClick={playScaleNotes}
                                    disabled={isPlayingScale}
                                    className={`
                                        flex items-center justify-center w-9 h-9 rounded-lg
                                        transition-all duration-200 ease-in-out
                                        ${isPlayingScale
                                            ? 'bg-green-900 bg-opacity-50 border border-green-700 cursor-not-allowed'
                                            : 'bg-[#4a5262] border border-gray-500 hover:bg-[#525a6b] hover:border-gray-400 hover:shadow-md active:scale-95'
                                        }
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#282c34]
                                        group
                                    `}
                                    title={isPlayingScale ? 'Playing scale...' : 'Play scale'}
                                >
                                    <PlayCircleIcon
                                        className={`w-5 h-5 transition-colors duration-200 ${isPlayingScale
                                                ? 'text-green-400 animate-pulse'
                                                : 'text-slate-300 group-hover:text-slate-100'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Mode Row */}
                            <div className="text-right">
                                <span className="text-sm text-slate-300 font-medium">Mode:</span>
                            </div>
                            <div className="flex items-center">
                                {modes && (
                                    <Dropdown
                                        value={mode}
                                        className='w-[11rem]'
                                        buttonClassName='px-3 py-2 text-left font-medium'
                                        menuClassName='min-w-[11rem]'
                                        onChange={setMode}
                                        showSearch={true}
                                        options={modes}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chord Table */}
                <div className="w-full max-w-7xl mb-20">
                    <ChordTable
                        chords={chords?.filter(c => !!c.chordName && !!c.chordNoteNames) as any}
                        loading={loadingChords}
                        onChordClick={handleChordClick}
                        addChordClick={addChordClick}
                    />
                </div>
            </div>

            {/* Chord Navigation Component */}
            <ChordNavigation
                addedChords={addedChords}
                activeChordIndex={activeChordIndex}
                highlightedChordIndex={highlightedChordIndex}
                isDeleteMode={isDeleteMode}
                isLiveMode={isLiveMode}
                globalPatternState={globalPatternState}
                onChordClick={handleChordClick}
                onClearAll={clearAllChords}
                onToggleDeleteMode={() => setIsDeleteMode(!isDeleteMode)}
                onToggleLiveMode={() => setIsLiveMode(!isLiveMode)}
                onTogglePlayback={handleTogglePlayback}
            />
        </div>
    );
}

export default App;