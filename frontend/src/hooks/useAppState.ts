import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MidiNumbers } from 'react-piano';
import { ModeScaleChordDto, ScaleNoteDto } from '../api';
import { dataService } from '../services/DataService';
import { useModes } from './useModes';
import { getMidiNotes } from '../util/ChordUtil';
import { normalizeNoteName } from '../util/NoteUtil';
import { 
    encodeAndSaveToUrl, 
    loadAndDecodeFromUrl, 
    type AddedChord,
    type PianoSettings 
} from '../util/urlStateEncoder';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

// Available keys for the dropdown
const AVAILABLE_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Default instrument list (will be replaced when actual list loads)
const DEFAULT_INSTRUMENTS = [
    'electric_piano_1', 'acoustic_grand_piano', 'bright_acoustic_piano', 
    'electric_grand_piano', 'honkytonk_piano', 'electric_piano_2', 'harpsichord', 'clavinet'
];

// Types
export interface ActiveNoteInfo {
    note: string;
    octave: number;
}

interface GlobalPatternState {
    currentPattern: string[];
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}

// Helper functions
const shouldPlayAtCurrentStep = (pattern: string[], stepIndex: number): boolean => {
    if (!pattern || pattern.length === 0) return true;
    const currentStepValue = pattern[stepIndex % pattern.length];
    return currentStepValue !== 'x' && currentStepValue !== 'X';
};

const resolvePatternForPlayback = (
    temporaryChord: { name: string; notes: string } | null,
    activeChordIndex: number | null,
    addedChords: AddedChord[],
    currentlyActivePattern: string[]
): string[] => {
    if (temporaryChord) {
        return currentlyActivePattern;
    }
    if (activeChordIndex !== null && addedChords[activeChordIndex]) {
        return addedChords[activeChordIndex].pattern;
    }
    return currentlyActivePattern;
};

const getDefaultPianoSettings = (): PianoSettings => ({
    instrumentName: 'electric_piano_1',
    cutOffPreviousNotes: true,
    eq: { bass: 0, mid: 0, treble: 0 },
    octaveOffset: 0,
    reverbLevel: 0.0,
    noteDuration: 0.8
});

export const useAppState = () => {
    // ========== STATE MANAGEMENT ==========
    
    // Core music data
    const [chords, setChords] = useState<ModeScaleChordDto[]>();
    const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
    const [key, setKey] = useState<string>('C');
    const [mode, setMode] = useState<string>('Ionian');
    const { modes } = useModes();

    // Available instruments state
    const [availableInstruments, setAvailableInstruments] = useState<string[]>(DEFAULT_INSTRUMENTS);

    // Piano settings state (lifted from PianoControl)
    const [pianoSettings, setPianoSettings] = useState<PianoSettings>(getDefaultPianoSettings());

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
        currentPattern: ['1', '2', '3', '4'],
        isPlaying: false,
        bpm: 120,
        subdivision: 0.25,
        swing: 0,
        currentStep: 0,
        repeat: true,
        lastChordChangeTime: 0,
        globalClockStartTime: 0,
    });

    const [currentlyActivePattern, setCurrentlyActivePattern] = useState<string[]>(['1', '2', '3', '4']);
    const [temporaryChord, setTemporaryChord] = useState<{ name: string; notes: string } | null>(null);

    // ========== REFS ==========
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const globalStepRef = useRef<number>(0);
    const sequencerStartTimeRef = useRef<number>(0);
    const nextStepTimeRef = useRef<number>(0);
    const silentAudioRef = useRef<HTMLAudioElement>(null);
    const audioInitializedRef = useRef(false);
    const hasLoadedFromUrl = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);

    // ========== COMPUTED VALUES ==========
    const baseStepDuration = useMemo(() => {
        const quarterNoteDuration = 60000 / globalPatternState.bpm;
        return quarterNoteDuration * globalPatternState.subdivision;
    }, [globalPatternState.bpm, globalPatternState.subdivision]);

    const normalizedScaleNotes: string[] = useMemo(() => {
        if (!scaleNotes) return [];
        return scaleNotes
            .map(scaleNote => scaleNote.noteName ? normalizeNoteName(scaleNote.noteName) : null)
            .filter(Boolean) as string[];
    }, [scaleNotes]);

    // Available modes for encoding
    const availableModes = useMemo(() => modes || ['Ionian'], [modes]);

    // ========== URL STATE MANAGEMENT ==========
    
    const saveStateToUrl = useCallback(() => {
        if (chords?.length && availableModes.length && !isInitialLoad.current) {
            console.log('Saving state to URL - addedChords:', addedChords.length);
            encodeAndSaveToUrl(
                key, 
                mode, 
                addedChords, 
                globalPatternState.currentPattern,
                globalPatternState.bpm, 
                globalPatternState.subdivision, 
                globalPatternState.swing, 
                showPatternSystem, 
                isLiveMode,
                pianoSettings,
                AVAILABLE_KEYS,
                availableModes,
                availableInstruments,
                chords
            );
        }
    }, [
        key, mode, addedChords, globalPatternState.currentPattern, globalPatternState.bpm, 
        globalPatternState.subdivision, globalPatternState.swing, showPatternSystem, isLiveMode,
        pianoSettings, availableModes, availableInstruments, chords
    ]);

    const loadStateFromUrl = useCallback(() => {
        if (chords?.length) {
            console.log('Loading state from URL - chords available:', chords.length);
            const decoded = loadAndDecodeFromUrl(
                AVAILABLE_KEYS,
                availableModes,
                availableInstruments,
                chords
            );
            if (decoded) {
                console.log('Loaded state from URL - addedChords:', decoded.addedChords.length);
                setKey(decoded.key);
                setMode(decoded.mode);
                setAddedChords(decoded.addedChords);
                setGlobalPatternState(prev => ({
                    ...prev,
                    currentPattern: decoded.pattern,
                    bpm: decoded.bpm,
                    subdivision: decoded.subdivision,
                    swing: decoded.swing
                }));
                setShowPatternSystem(decoded.showPattern);
                setIsLiveMode(decoded.liveMode);
                setPianoSettings(decoded.pianoSettings);
            } else {
                console.log('No valid state found in URL');
            }
        }
    }, [chords, availableModes, availableInstruments]);

    // ========== PIANO SETTINGS CALLBACKS ==========
    const updatePianoSettings = useCallback((updates: Partial<PianoSettings>) => {
        setPianoSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const setPianoInstrument = useCallback((instrumentName: string) => {
        updatePianoSettings({ instrumentName });
    }, [updatePianoSettings]);

    const setCutOffPreviousNotes = useCallback((cutOffPreviousNotes: boolean) => {
        updatePianoSettings({ cutOffPreviousNotes });
    }, [updatePianoSettings]);

    const setEq = useCallback((eq: { bass: number; mid: number; treble: number }) => {
        updatePianoSettings({ eq });
    }, [updatePianoSettings]);

    const setOctaveOffset = useCallback((octaveOffset: number) => {
        updatePianoSettings({ octaveOffset });
    }, [updatePianoSettings]);

    const setReverbLevel = useCallback((reverbLevel: number) => {
        updatePianoSettings({ reverbLevel });
    }, [updatePianoSettings]);

    const setNoteDuration = useCallback((noteDuration: number) => {
        updatePianoSettings({ noteDuration });
    }, [updatePianoSettings]);

    // ========== CALLBACKS ==========
    const getSwingDuration = useCallback((stepIndex: number) => {
        if (globalPatternState.swing === 0) return baseStepDuration;
        const isOffBeat = stepIndex % 2 === 1;
        const swingRatio = 1 + (globalPatternState.swing / 100);
        return isOffBeat ? baseStepDuration * swingRatio : baseStepDuration / swingRatio;
    }, [baseStepDuration, globalPatternState.swing]);

    const getCurrentPattern = useCallback(() => {
        return resolvePatternForPlayback(
            temporaryChord,
            activeChordIndex,
            addedChords,
            currentlyActivePattern
        );
    }, [temporaryChord, activeChordIndex, addedChords, currentlyActivePattern]);

    const playNotes = useCallback((notes: ActiveNoteInfo[]) => {
        setActiveNotes([]);
        setTimeout(() => setActiveNotes(notes), 10);
    }, []);

	const removeChord = useCallback((indexToRemove: number) => {
        setAddedChords(current => {
            const newChords = current.filter((_, index) => index !== indexToRemove);
            console.log('Removed chord, new total:', newChords.length);
            if (newChords.length === 0 && isLiveMode) {
                setIsLiveMode(false);
            }
            return newChords;
        });

        if (activeChordIndex === indexToRemove) {
            setActiveChordIndex(null);
        } else if (activeChordIndex !== null && activeChordIndex > indexToRemove) {
            setActiveChordIndex(activeChordIndex - 1);
        }
    }, [activeChordIndex, isLiveMode]);

    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
        if (isDeleteMode && chordIndex !== undefined) {
            removeChord(chordIndex);
            return;
        }

        const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, chordNoteNames);

        if (chordIndex !== undefined) {
            setTemporaryChord(null);
            setActiveChordIndex(chordIndex);

            if (!globalPatternState.isPlaying) {
                playNotes(notesWithOctaves as ActiveNoteInfo[]);
            }

            setHighlightedChordIndex(chordIndex);
            setTimeout(() => setHighlightedChordIndex(null), 150);
        } else {
            if (chordName) {
                setTemporaryChord({ name: chordName, notes: chordNoteNames });
            }

            if (!globalPatternState.isPlaying) {
                playNotes(notesWithOctaves as ActiveNoteInfo[]);
            }
        }
    }, [playNotes, globalPatternState.isPlaying, isDeleteMode, removeChord]);

    const addChordClick = useCallback((chordName: string, chordNotes: string) => {
        setAddedChords(current => {
            const newChords = [...current, {
                name: chordName,
                notes: chordNotes,
                pattern: [...currentlyActivePattern]
            }];
            console.log('Added chord, new total:', newChords.length);
            return newChords;
        });
    }, [currentlyActivePattern]);

    const clearAllChords = useCallback(() => {
        setAddedChords([]);
        setGlobalPatternState(prev => ({ ...prev, isPlaying: false }));
        setActiveChordIndex(null);
        setTemporaryChord(null);
        setIsLiveMode(false);
    }, []);

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

        const wasPlaying = globalPatternState.isPlaying;
        if (wasPlaying) {
            setGlobalPatternState(prev => ({ ...prev, isPlaying: false }));
        }

        setActiveNotes([]);

        const quarterNoteDuration = 60000 / globalPatternState.bpm;
        const noteDuration = quarterNoteDuration * 0.8;
        
        let cumulativeDelay = 100;
        let currentOctave = 4;
        let lastMidiNumber = 0;

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

        setTimeout(() => {
            setActiveNotes([]);
            setIsPlayingScale(false);
            if (wasPlaying) {
                setGlobalPatternState(prev => ({ ...prev, isPlaying: true }));
            }
        }, cumulativeDelay + noteDuration);
    }, [scaleNotes, globalPatternState.isPlaying, globalPatternState.bpm, isPlayingScale]);

    const handlePatternChange = useCallback((newPatternState: Partial<GlobalPatternState>) => {
        setGlobalPatternState(prev => ({
            ...prev,
            ...newPatternState,
        }));

        if (newPatternState.hasOwnProperty('isPlaying') && newPatternState.isPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
            nextStepTimeRef.current = Date.now();
        }

        if (newPatternState.hasOwnProperty('currentStep') && newPatternState.currentStep === 0) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
            nextStepTimeRef.current = Date.now();
        }
    }, []);

    const handleTogglePlayback = useCallback(() => {
        const newIsPlaying = !globalPatternState.isPlaying;
        setGlobalPatternState(prev => ({
            ...prev,
            isPlaying: newIsPlaying,
        }));

        if (newIsPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = Date.now();
            nextStepTimeRef.current = Date.now();
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

            if (newIsPlaying) {
                globalStepRef.current = 0;
                sequencerStartTimeRef.current = Date.now();
                nextStepTimeRef.current = Date.now();
            }
            return;
        }

        const keyMapIndex = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
        if (!isNaN(keyMapIndex) && keyMapIndex >= 0 && keyMapIndex < addedChords.length) {
            const chordToPlay = addedChords[keyMapIndex];
            if (chordToPlay) {
                setTemporaryChord(null);
                handleChordClick(chordToPlay.notes, keyMapIndex);
            }
        }
    }, [addedChords, handleChordClick, globalPatternState.isPlaying]);

    // Audio initialization
    const initializeAudio = useCallback(async () => {
        if (!audioInitializedRef.current) {
            try {
                await silentAudioRef.current?.play();
                audioInitializedRef.current = true;

                document.removeEventListener('touchstart', initializeAudio);
                document.removeEventListener('mousedown', initializeAudio);
                document.removeEventListener('click', initializeAudio);
            } catch (error) {
                console.error('failed to initialize audio:', error);
            }
        }
    }, []);

    // ========== EFFECTS ==========

    // Audio initialization effect
    useEffect(() => {
        document.addEventListener('touchstart', initializeAudio);
        document.addEventListener('mousedown', initializeAudio);
        document.addEventListener('click', initializeAudio);

        return () => {
            document.removeEventListener('touchstart', initializeAudio);
            document.removeEventListener('mousedown', initializeAudio);
            document.removeEventListener('click', initializeAudio);
        };
    }, [initializeAudio]);

    // Sequencer timing effect
    useEffect(() => {
        if (globalPatternState.isPlaying) {
            if (!intervalRef.current) {
                sequencerStartTimeRef.current = Date.now();
                nextStepTimeRef.current = Date.now();
                globalStepRef.current = 0;

                setGlobalPatternState(prev => ({
                    ...prev,
                    currentStep: 0
                }));

                const tick = () => {
                    const now = Date.now();

                    if (now >= nextStepTimeRef.current) {
                        globalStepRef.current++;

                        const nextStepDuration = getSwingDuration(globalStepRef.current);
                        nextStepTimeRef.current = now + nextStepDuration;

                        setGlobalPatternState(prev => ({
                            ...prev,
                            currentStep: globalStepRef.current
                        }));
                    }

                    intervalRef.current = setTimeout(tick, 5);
                };

                tick();
            }
        } else {
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [globalPatternState.isPlaying, getSwingDuration]);

    // Update currently active pattern
    useEffect(() => {
        if (activeChordIndex !== null && addedChords[activeChordIndex]) {
            setCurrentlyActivePattern([...addedChords[activeChordIndex].pattern]);
        } else {
            setCurrentlyActivePattern([...globalPatternState.currentPattern]);
        }
    }, [activeChordIndex, addedChords, globalPatternState.currentPattern]);

    // Keep activeNotes in sync with sequencer
    useEffect(() => {
        if (globalPatternState.isPlaying) {
            let currentChord = null;

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

                if (shouldPlayAtCurrentStep(currentPattern, currentStepIndex)) {
                    const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
                    setActiveNotes(notesWithOctaves as ActiveNoteInfo[]);
                } else {
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
        currentlyActivePattern
    ]);

    // Fetch chords and scale notes when key/mode changes
    useEffect(() => {
        if (!key) return;
        setLoadingChords(true);

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

    // Load state from URL when chords first become available
    useEffect(() => {
        if (chords?.length && !hasLoadedFromUrl.current) {
            hasLoadedFromUrl.current = true;
            isInitialLoad.current = true;
            loadStateFromUrl();
            // Allow saving after a brief delay to ensure the load is complete
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 100);
        }
    }, [chords, loadStateFromUrl]);

    // Save state to URL when relevant state changes (with improved debouncing)
    useEffect(() => {
        if (chords?.length && availableModes.length && !isInitialLoad.current) {
            // Clear any existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            
            // Debounce the save with a shorter delay for better responsiveness
            saveTimeoutRef.current = setTimeout(() => {
                saveStateToUrl();
            }, 100);
        }
        
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [
        key, mode, addedChords, globalPatternState.currentPattern, globalPatternState.bpm, 
        globalPatternState.subdivision, globalPatternState.swing, showPatternSystem, isLiveMode,
        pianoSettings, chords?.length, availableModes.length, saveStateToUrl
    ]);

    // Keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    // ========== RETURN VALUES ==========
    return {
        // State
        chords,
        scaleNotes,
        key,
        mode,
        modes,
        activeNotes,
        activeChordIndex,
        highlightedChordIndex,
        addedChords,
        loadingChords,
        isDeleteMode,
        isPlayingScale,
        showPatternSystem,
        isLiveMode,
        globalPatternState,
        currentlyActivePattern,
        temporaryChord,
        normalizedScaleNotes,
        pianoSettings,
        availableInstruments,
        
        // Refs (for the silent audio element)
        silentAudioRef,
        
        // Handlers
        setKey,
        setMode,
        setIsDeleteMode,
        setShowPatternSystem,
        setIsLiveMode,
        setAvailableInstruments,
        handleChordClick,
        addChordClick,
        removeChord,
        clearAllChords,
        updateChordPattern,
        playScaleNotes,
        handlePatternChange,
        handleTogglePlayback,
        getCurrentPattern,
        
        // Piano settings handlers
        setPianoInstrument,
        setCutOffPreviousNotes,
        setEq,
        setOctaveOffset,
        setReverbLevel,
        setNoteDuration,
        updatePianoSettings,
        
        // Helper functions
        playNotes,
        saveStateToUrl,
        loadStateFromUrl,
    };
};