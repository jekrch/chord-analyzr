import { useEffect, useRef, useCallback, useMemo } from 'react';
import { MidiNumbers } from 'react-piano';
import { useMusicStore } from '../stores/musicStore';
import { usePianoStore } from '../stores/pianoStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import { useUIStore } from '../stores/uiStore';
import { useModes } from './useModes';
import { getMidiNotes } from '../util/ChordUtil';
import { normalizeNoteName } from '../util/NoteUtil';
import {
    encodeAndSaveToUrl,
    loadAndDecodeFromUrl,
} from '../util/urlStateEncoder';
import { dynamicChordGenerator } from '../services/DynamicChordService';

const START_OCTAVE = 4;
const END_OCTAVE = 7;
export const AVAILABLE_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

// Helper functions
const shouldPlayAtCurrentStep = (pattern: string[], stepIndex: number): boolean => {
    if (!pattern || pattern.length === 0) return true;
    const currentStepValue = pattern[stepIndex % pattern.length];
    return currentStepValue !== 'x' && currentStepValue !== 'X';
};

const resolvePatternForPlayback = (
    temporaryChord: { name: string; notes: string } | null,
    activeChordIndex: number | null,
    addedChords: any[],
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

export const useIntegratedAppLogic = () => {
    // Store access
    const musicStore = useMusicStore();
    const pianoStore = usePianoStore();
    const playbackStore = usePlaybackStore();
    const patternStore = usePatternStore();
    const uiStore = useUIStore();
    const { modes } = useModes();

    // Refs for complex timing logic
    const intervalRef = useRef<number | null>(null);
    const globalStepRef = useRef<number>(0);
    const sequencerStartTimeRef = useRef<number>(0);
    const hasLoadedFromUrl = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (modes && !hasInitialized.current) {
            hasInitialized.current = true;
            musicStore.setModes(modes);

            // Check if we have URL state to load
            const urlParams = new URLSearchParams(window.location.search);
            const hasUrlState = urlParams.has('s');

            // Only initialize with defaults if no chords AND no URL state
            if (!musicStore.chords && !hasUrlState) {
                musicStore.initialize();
            }
        }
    }, [modes]);

    // Computed values
    const baseStepDuration = useMemo(() => {
        const quarterNoteDuration = 60000 / patternStore.globalPatternState.bpm;
        return quarterNoteDuration * patternStore.globalPatternState.subdivision;
    }, [patternStore.globalPatternState.bpm, patternStore.globalPatternState.subdivision]);

    const getSwingDuration = useCallback((stepIndex: number) => {
        if (patternStore.globalPatternState.swing === 0) return baseStepDuration;
        const isOffBeat = stepIndex % 2 === 1;
        const swingRatio = 1 + (patternStore.globalPatternState.swing / 100);
        return isOffBeat ? baseStepDuration * swingRatio : baseStepDuration / swingRatio;
    }, [baseStepDuration, patternStore.globalPatternState.swing]);

    const getCurrentPattern = useCallback(() => {
        return resolvePatternForPlayback(
            playbackStore.temporaryChord,
            playbackStore.activeChordIndex,
            playbackStore.addedChords,
            patternStore.currentlyActivePattern
        );
    }, [playbackStore.temporaryChord, playbackStore.activeChordIndex, playbackStore.addedChords, patternStore.currentlyActivePattern]);

    // Memoize the current chord to reduce recalculations
    const currentChord = useMemo(() => {
        if (playbackStore.temporaryChord) {
            return playbackStore.temporaryChord;
        } else if (playbackStore.activeChordIndex !== null && playbackStore.addedChords[playbackStore.activeChordIndex]) {
            return playbackStore.addedChords[playbackStore.activeChordIndex];
        }
        return null;
    }, [playbackStore.temporaryChord, playbackStore.activeChordIndex, playbackStore.addedChords]);

    // Memoize the current pattern
    const currentPattern = useMemo(() => {
        return getCurrentPattern();
    }, [getCurrentPattern]);

    // URL State Management
    const saveStateToUrl = useCallback(() => {
        if (musicStore.chords?.length && modes?.length && !isInitialLoad.current) {
            encodeAndSaveToUrl(
                musicStore.key,
                musicStore.mode,
                playbackStore.addedChords,
                patternStore.globalPatternState.currentPattern,
                patternStore.globalPatternState.bpm,
                patternStore.globalPatternState.subdivision,
                patternStore.globalPatternState.swing,
                uiStore.showPatternSystem,
                uiStore.isLiveMode,
                pianoStore.pianoSettings,
                AVAILABLE_KEYS,
                modes,
                pianoStore.availableInstruments,
                musicStore.chords,
                dynamicChordGenerator.chordTypes
            );
        }
    }, [
        musicStore.key, musicStore.mode, musicStore.chords,
        playbackStore.addedChords,
        patternStore.globalPatternState,
        uiStore.showPatternSystem, uiStore.isLiveMode,
        pianoStore.pianoSettings, pianoStore.availableInstruments,
        modes
    ]);

    const loadStateFromUrl = useCallback(() => {
        if (musicStore.chords?.length) {
            const decoded = loadAndDecodeFromUrl(
                AVAILABLE_KEYS,
                modes || [],
                pianoStore.availableInstruments,
                musicStore.chords,
                dynamicChordGenerator.chordTypes
            );
            if (decoded) {
                // Use setKeyAndMode instead of calling setKey and setMode separately
                musicStore.setKeyAndMode(decoded.key, decoded.mode);

                // Clear and set added chords with proper fallbacks for optional properties
                playbackStore.clearAllChords();
                decoded.addedChords.forEach(chord => {
                    playbackStore.addChord(
                        chord.name,
                        chord.notes,
                        chord.pattern || ['1', '2', '3', '4'],
                        chord.originalKey || decoded.key,
                        chord.originalMode || decoded.mode
                    );
                });

                patternStore.setGlobalPatternState({
                    currentPattern: decoded.pattern,
                    bpm: decoded.bpm,
                    subdivision: decoded.subdivision,
                    swing: decoded.swing
                });

                uiStore.setShowPatternSystem(decoded.showPattern);
                uiStore.setIsLiveMode(decoded.liveMode);
                pianoStore.updatePianoSettings(decoded.pianoSettings);
            }
        }
    }, [musicStore.chords, modes, pianoStore.availableInstruments]);

    // Complex handlers that need to coordinate between stores
    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
        if (uiStore.isDeleteMode && chordIndex !== undefined) {
            playbackStore.removeChord(chordIndex);
            return;
        }

        const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, chordNoteNames);

        if (chordIndex !== undefined) {
            playbackStore.setTemporaryChord(null);
            playbackStore.setActiveChordIndex(chordIndex);

            // If NOT playing, preview the chord immediately
            if (!patternStore.globalPatternState.isPlaying) {
                playbackStore.playNotes(notesWithOctaves as any);
            }
            // If IS playing, the chord will play on the next beat automatically
            // via the activeNotes sync effect

            playbackStore.setHighlightedChordIndex(chordIndex);
            setTimeout(() => playbackStore.setHighlightedChordIndex(null), 150);
        } else {
            if (chordName) {
                playbackStore.setTemporaryChord({ name: chordName, notes: chordNoteNames });
            }

            if (!patternStore.globalPatternState.isPlaying) {
                playbackStore.playNotes(notesWithOctaves as any);
            }
        }
    }, [uiStore.isDeleteMode, patternStore.globalPatternState.isPlaying]);

    const addChordClick = useCallback((chordName: string, chordNotes: string, key: string, mode: string) => {
        //console.log('Adding chord:', { chordName, chordNotes, key, mode })
        playbackStore.addChord(
            chordName,
            chordNotes,
            patternStore.currentlyActivePattern,
            key,
            mode
        );
    }, [patternStore.currentlyActivePattern, musicStore.key, musicStore.mode]);

    const updateChordWithFallbacks = useCallback((chordIndex: number, updatedChord: any) => {
        // Ensure all required properties are present with fallbacks
        const normalizedChord = {
            name: updatedChord.name,
            notes: updatedChord.notes,
            pattern: updatedChord.pattern || ['1', '2', '3', '4'],
            originalKey: updatedChord.originalKey || musicStore.key,
            originalMode: updatedChord.originalMode || musicStore.mode,
            originalNotes: updatedChord.originalNotes || updatedChord.notes
        };

        playbackStore.updateChord(chordIndex, normalizedChord);
    }, [musicStore.key, musicStore.mode]);

    const reorderChords = useCallback((sourceIndex: number, destinationIndex: number) => {
        const currentChords = Array.from(playbackStore.addedChords);
        const [removed] = currentChords.splice(sourceIndex, 1);
        currentChords.splice(destinationIndex, 0, removed);

        playbackStore.setAddedChords(currentChords);

        const { activeChordIndex } = playbackStore;
        if (activeChordIndex === null) return;

        let newActiveIndex = activeChordIndex;
        if (activeChordIndex === sourceIndex) {
            newActiveIndex = destinationIndex;
        } else if (sourceIndex < activeChordIndex && destinationIndex >= activeChordIndex) {
            newActiveIndex = activeChordIndex - 1;
        } else if (sourceIndex > activeChordIndex && destinationIndex <= activeChordIndex) {
            newActiveIndex = activeChordIndex + 1;
        }

        if (newActiveIndex !== activeChordIndex) {
            playbackStore.setActiveChordIndex(newActiveIndex);
        }
    }, [playbackStore]);

    const clearAllChords = useCallback(() => {
        playbackStore.clearAllChords();
        patternStore.setGlobalPatternState({ isPlaying: false });
        uiStore.setIsLiveMode(false);
    }, []);

    const handlePatternChange = useCallback((newPatternState: Partial<any>) => {
        patternStore.updatePattern(newPatternState);

        // Only reset timing when explicitly starting playback
        if (newPatternState.hasOwnProperty('isPlaying') && newPatternState.isPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = performance.now();
        }
    }, []);

    const handleTogglePlayback = useCallback(() => {
        const newIsPlaying = !patternStore.globalPatternState.isPlaying;
        patternStore.setGlobalPatternState({ isPlaying: newIsPlaying });

        if (newIsPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = performance.now();
        }
    }, [patternStore.globalPatternState.isPlaying]);

    const toggleScalePlayback = useCallback(() => {
        if (playbackStore.isPlayingScale) {
            playbackStore.clearScalePlaybackTimeouts();
            playbackStore.setActiveNotes([]);
            playbackStore.setIsPlayingScale(false);
            return;
        }

        if (!musicStore.scaleNotes?.length) return;

        playbackStore.setIsPlayingScale(true);

        const wasPlaying = patternStore.globalPatternState.isPlaying;
        if (wasPlaying) {
            patternStore.setGlobalPatternState({ isPlaying: false });
        }

        playbackStore.setActiveNotes([]);

        const quarterNoteDuration = 60000 / patternStore.globalPatternState.bpm;
        const noteDuration = quarterNoteDuration * 0.8;

        let cumulativeDelay = 100;
        let currentOctave = 4;
        let lastMidiNumber = 0;

        const scaleNotesWithTonic = [...musicStore.scaleNotes];
        if (musicStore.scaleNotes[0]?.noteName) {
            scaleNotesWithTonic.push({ noteName: musicStore.scaleNotes[0].noteName });
        }

        scaleNotesWithTonic.forEach((scaleNote) => {
            if (!scaleNote.noteName) return;

            const timeoutId = setTimeout(() => {
                const noteName = normalizeNoteName(scaleNote.noteName);
                if (!noteName) return;

                let midiNumber: number = MidiNumbers.fromNote(noteName + currentOctave);

                if (midiNumber <= lastMidiNumber) {
                    currentOctave++;
                    midiNumber = MidiNumbers.fromNote(noteName + currentOctave);
                }

                lastMidiNumber = midiNumber;
                const noteDetails = MidiNumbers.getAttributes(midiNumber);
                const note = noteDetails.note.slice(0, -1);
                const octave = parseInt(noteDetails.note.slice(-1), 10);

                playbackStore.setActiveNotes([{ midiNote: midiNumber, note, octave }]);
            }, cumulativeDelay);

            playbackStore.addScalePlaybackTimeout(timeoutId);
            cumulativeDelay += noteDuration;
        });

        const finalTimeoutId = setTimeout(() => {
            playbackStore.setActiveNotes([]);
            playbackStore.setIsPlayingScale(false);
            playbackStore.clearScalePlaybackTimeouts();
            if (wasPlaying) {
                patternStore.setGlobalPatternState({ isPlaying: true });
            }
        }, cumulativeDelay + noteDuration);

        playbackStore.addScalePlaybackTimeout(finalTimeoutId);
    }, [musicStore.scaleNotes, playbackStore.isPlayingScale, patternStore.globalPatternState.bpm, patternStore.globalPatternState.isPlaying]);

    // Keyboard handlers
    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key.toLowerCase() === 'p') {
            uiStore.togglePatternSystem();
            return;
        }

        if (event.key.toLowerCase() === 'l') {
            uiStore.toggleLiveMode();
            return;
        }

        if (event.key === ' ') {
            event.preventDefault();
            handleTogglePlayback();
            return;
        }

        const keyMapIndex = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
        if (!isNaN(keyMapIndex) && keyMapIndex >= 0 && keyMapIndex < playbackStore.addedChords.length) {
            const chordToPlay = playbackStore.addedChords[keyMapIndex];
            if (chordToPlay) {
                playbackStore.setTemporaryChord(null);
                handleChordClick(chordToPlay.notes, keyMapIndex);
            }
        }
    }, [playbackStore.addedChords, handleChordClick, handleTogglePlayback]);

    // Effects

    // Update currently active pattern
    useEffect(() => {
        if (playbackStore.activeChordIndex !== null && playbackStore.addedChords[playbackStore.activeChordIndex]) {
            patternStore.setCurrentlyActivePattern([...playbackStore.addedChords[playbackStore.activeChordIndex].pattern]);
        } else {
            patternStore.setCurrentlyActivePattern([...patternStore.globalPatternState.currentPattern]);
        }
    }, [playbackStore.activeChordIndex, playbackStore.addedChords, patternStore.globalPatternState.currentPattern]);

    // Sequencer timing
    useEffect(() => {
        if (patternStore.globalPatternState.isPlaying) {
            if (!intervalRef.current) {
                sequencerStartTimeRef.current = performance.now();
                globalStepRef.current = 0;
                patternStore.setGlobalPatternState({ currentStep: 0 });

                const tick = () => {
                    const now = performance.now();
                    const elapsed = now - sequencerStartTimeRef.current;
                    
                    // Calculate which step we SHOULD be on based on elapsed time
                    // This prevents drift accumulation
                    let totalTime = 0;
                    let calculatedStep = 0;
                    
                    // Find the current step by summing swing durations
                    while (totalTime < elapsed) {
                        totalTime += getSwingDuration(calculatedStep);
                        if (totalTime <= elapsed) {
                            calculatedStep++;
                        }
                    }
                    
                    // Only update if step actually changed
                    if (calculatedStep !== globalStepRef.current) {
                        globalStepRef.current = calculatedStep;
                        patternStore.setGlobalPatternState({ currentStep: calculatedStep });
                    }
                    
                    // Use requestAnimationFrame for smoother, more efficient updates
                    intervalRef.current = requestAnimationFrame(tick);
                };

                intervalRef.current = requestAnimationFrame(tick);
            }
        } else {
            if (intervalRef.current) {
                cancelAnimationFrame(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                cancelAnimationFrame(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [patternStore.globalPatternState.isPlaying, getSwingDuration]);

    // Keep activeNotes in sync with sequencer
    useEffect(() => {
        if (!patternStore.globalPatternState.isPlaying || !currentChord) {
            return;
        }

        const currentStepIndex = patternStore.globalPatternState.currentStep % currentPattern.length;

        if (shouldPlayAtCurrentStep(currentPattern, currentStepIndex)) {
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
            playbackStore.setActiveNotes(notesWithOctaves as any);
        } else {
            playbackStore.setActiveNotes([]);
        }
    }, [
        patternStore.globalPatternState.isPlaying,
        patternStore.globalPatternState.currentStep,
        currentChord,
        currentPattern
    ]);

    // Load state from URL when chords first become available
    useEffect(() => {
        if (musicStore.chords?.length && !hasLoadedFromUrl.current) {
            hasLoadedFromUrl.current = true;
            isInitialLoad.current = true;
            loadStateFromUrl();
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 100);
        }
    }, [musicStore.chords, loadStateFromUrl]);

    // Save state to URL when relevant state changes
    useEffect(() => {
        if (musicStore.chords?.length && modes?.length && !isInitialLoad.current) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

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
        musicStore.key, musicStore.mode, playbackStore.addedChords,
        patternStore.globalPatternState, uiStore.showPatternSystem, uiStore.isLiveMode,
        pianoStore.pianoSettings, musicStore.chords?.length, modes?.length, saveStateToUrl
    ]);

    // Keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    // Return a consolidated interface similar to the original useAppState
    return {
        // State from stores
        chords: musicStore.chords,
        key: musicStore.key,
        mode: musicStore.mode,
        modes: musicStore.modes,
        activeNotes: playbackStore.activeNotes,
        activeChordIndex: playbackStore.activeChordIndex,
        highlightedChordIndex: playbackStore.highlightedChordIndex,
        addedChords: playbackStore.addedChords,
        loadingChords: musicStore.loadingChords,
        isDeleteMode: uiStore.isDeleteMode,
        isPlayingScale: playbackStore.isPlayingScale,
        isLiveMode: uiStore.isLiveMode,
        globalPatternState: patternStore.globalPatternState,
        currentlyActivePattern: patternStore.currentlyActivePattern,
        temporaryChord: playbackStore.temporaryChord,
        normalizedScaleNotes: musicStore.normalizedScaleNotes,
        pianoSettings: pianoStore.pianoSettings,
        availableInstruments: pianoStore.availableInstruments,

        // Handlers that coordinate between stores
        setKey: musicStore.setKey,
        setMode: musicStore.setMode,
        setIsDeleteMode: uiStore.setIsDeleteMode,
        setIsLiveMode: uiStore.setIsLiveMode,
        setAvailableInstruments: pianoStore.setAvailableInstruments,
        handleChordClick,
        addChordClick,
        updateChord: updateChordWithFallbacks,
        reorderChords,
        clearAllChords,
        updateChordPattern: playbackStore.updateChordPattern,
        toggleScalePlayback,
        handlePatternChange,
        handleTogglePlayback,
        getCurrentPattern,
        handleFetchOriginalChord: playbackStore.handleFetchOriginalChord,

        // Piano settings handlers
        setPianoInstrument: pianoStore.setPianoInstrument,
        setCutOffPreviousNotes: pianoStore.setCutOffPreviousNotes,
        setEq: pianoStore.setEq,
        setOctaveOffset: pianoStore.setOctaveOffset,
        setReverbLevel: pianoStore.setReverbLevel,
        setNoteDuration: pianoStore.setNoteDuration,
        setVolume: pianoStore.setVolume,
        setChorusLevel: pianoStore.setChorusLevel,
        setDelayLevel: pianoStore.setDelayLevel,
        setDistortionLevel: pianoStore.setDistortionLevel,
        setBitcrusherLevel: pianoStore.setBitcrusherLevel,
        setPhaserLevel: pianoStore.setPhaserLevel,
        setFlangerLevel: pianoStore.setFlangerLevel,
        setRingModLevel: pianoStore.setRingModLevel,
        setAutoFilterLevel: pianoStore.setAutoFilterLevel,
        setTremoloLevel: pianoStore.setTremoloLevel,
        setStereoWidthLevel: pianoStore.setStereoWidthLevel,
        setCompressorLevel: pianoStore.setCompressorLevel,
    };
};