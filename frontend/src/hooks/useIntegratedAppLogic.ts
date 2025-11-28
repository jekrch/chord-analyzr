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
    noteToPitchClass,
    respellNotesPreservingOrder,
} from '../util/url/stateSerializer';
import { dynamicChordGenerator, GeneratedChord } from '../services/DynamicChordService';

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

/**
 * Update chord name to match the enharmonic spelling of regenerated notes
 */
function updateChordNameFromNotes(chordName: string, regeneratedNotes: string): string {
    const slashIndex = chordName.lastIndexOf('/');
    let mainPart: string;
    let slashPart: string | null = null;

    if (slashIndex >= 0) {
        mainPart = chordName.substring(0, slashIndex);
        const potentialSlashNote = chordName.substring(slashIndex + 1);

        if (/^[A-G](?:##|#|bb|b)?$/.test(potentialSlashNote)) {
            slashPart = potentialSlashNote;
        } else {
            mainPart = chordName;
        }
    } else {
        mainPart = chordName;
    }

    const notesArray = regeneratedNotes.split(',').map(n => n.trim());
    const rootNoteIndex = slashPart ? 1 : 0;

    if (rootNoteIndex >= notesArray.length) {
        return chordName;
    }

    const rootNoteWithOctave = notesArray[rootNoteIndex];
    const newRootNote = rootNoteWithOctave.replace(/\d+/g, '');

    const rootMatch = mainPart.match(/^([A-G](?:##|#|bb|b)?)/);
    if (!rootMatch) {
        return chordName;
    }

    const oldRootNote = rootMatch[1];
    const chordSuffix = mainPart.substring(oldRootNote.length);

    let updatedName = newRootNote + chordSuffix;

    if (slashPart) {
        const slashNoteWithOctave = notesArray[0];
        const regeneratedSlashNote = slashNoteWithOctave.replace(/\d+/g, '');
        updatedName += '/' + regeneratedSlashNote;
    }

    return updatedName;
}

function parseChordName(chordName: string): {
    rootNote: string;
    chordType: string;
    slashNote: string | null;
} {
    const slashIndex = chordName.lastIndexOf('/');
    let mainChord = chordName;
    let slashNote: string | null = null;

    if (slashIndex !== -1) {
        const potentialSlashNote = chordName.substring(slashIndex + 1);

        if (/^[A-G](?:##|#|bb|b)?$/.test(potentialSlashNote)) {
            mainChord = chordName.substring(0, slashIndex);
            slashNote = potentialSlashNote;
        }
    }

    const match = mainChord.match(/^([A-G](?:##|bb|#|b)?)(.*)$/);

    if (!match) {
        throw new Error(`Cannot parse chord name: ${chordName}`);
    }

    return {
        rootNote: match[1],
        chordType: match[2],
        slashNote: slashNote
    };
}

async function regenerateSlashNote(slashNote: string, newName: string, regenerated: GeneratedChord, newNotes: string, key: string, mode: string) {
    const slashNoteRegenerated = await dynamicChordGenerator.generateChord(
        slashNote,
        '',
        key,
        mode
    );

    if (slashNoteRegenerated) {
        const regeneratedSlashNote = slashNoteRegenerated.chordNoteNames.split(',')[0].trim();
        newName = `${regenerated.chordName}/${regeneratedSlashNote}`;

        const chordNotesArray = newNotes.split(',').map(n => n.trim());
        const slashNoteExists = chordNotesArray.some(note => {
            const noteNameOnly = note.replace(/\d+/, '');
            const slashNoteNameOnly = regeneratedSlashNote.replace(/\d+/, '');
            return noteNameOnly === slashNoteNameOnly;
        });

        if (slashNoteExists) {
            const filteredNotes = chordNotesArray.filter(note => {
                const noteNameOnly = note.replace(/\d+/, '');
                const slashNoteNameOnly = regeneratedSlashNote.replace(/\d+/, '');
                return noteNameOnly !== slashNoteNameOnly;
            });
            newNotes = [regeneratedSlashNote, ...filteredNotes].join(', ');
        } else {
            newNotes = `${regeneratedSlashNote}, ${newNotes}`;
        }
    }
    return { newName, newNotes };
}

/**
 * Main hook that handles all app logic and effects.
 * This hook should always be called to ensure effects run.
 */
export const useIntegratedAppLogic = () => {

    // musicStore selectors
    const chords = useMusicStore((state) => state.chords);
    const key = useMusicStore((state) => state.key);
    const mode = useMusicStore((state) => state.mode);
    const modes = useMusicStore((state) => state.modes);
    const scaleNotes = useMusicStore((state) => state.scaleNotes);
    const setKeyAndMode = useMusicStore((state) => state.setKeyAndMode);
    const setModes = useMusicStore((state) => state.setModes);
    const initialize = useMusicStore((state) => state.initialize);

    // playbackStore selectors
    const activeNotes = usePlaybackStore((state) => state.activeNotes);
    const activeChordIndex = usePlaybackStore((state) => state.activeChordIndex);
    const addedChords = usePlaybackStore((state) => state.addedChords);
    const temporaryChord = usePlaybackStore((state) => state.temporaryChord);
    const isPlayingScale = usePlaybackStore((state) => state.isPlayingScale);
    const setActiveNotes = usePlaybackStore((state) => state.setActiveNotes);
    const setActiveChordIndex = usePlaybackStore((state) => state.setActiveChordIndex);
    const setHighlightedChordIndex = usePlaybackStore((state) => state.setHighlightedChordIndex);
    const setTemporaryChord = usePlaybackStore((state) => state.setTemporaryChord);
    const setIsPlayingScale = usePlaybackStore((state) => state.setIsPlayingScale);
    const addChord = usePlaybackStore((state) => state.addChord);
    const removeChord = usePlaybackStore((state) => state.removeChord);
    const setAddedChords = usePlaybackStore((state) => state.setAddedChords);
    const clearAllChordsAction = usePlaybackStore((state) => state.clearAllChords);
    const playNotes = usePlaybackStore((state) => state.playNotes);
    const clearScalePlaybackTimeouts = usePlaybackStore((state) => state.clearScalePlaybackTimeouts);
    const addScalePlaybackTimeout = usePlaybackStore((state) => state.addScalePlaybackTimeout);

    // patternStore selectors
    const subdivision = usePatternStore((state) => state.globalPatternState.subdivision);
    const currentStep = usePatternStore((state) => state.globalPatternState.currentStep);
    const swing = usePatternStore((state) => state.globalPatternState.swing);
    const isPlaying = usePatternStore((state) => state.globalPatternState.isPlaying);
    const bpm = usePatternStore((state) => state.globalPatternState.bpm);
    const globalCurrentPattern = usePatternStore((state) => state.globalPatternState.currentPattern);
    const currentlyActivePattern = usePatternStore((state) => state.currentlyActivePattern);
    const setGlobalPatternState = usePatternStore((state) => state.setGlobalPatternState);
    const setCurrentlyActivePattern = usePatternStore((state) => state.setCurrentlyActivePattern);
    const updatePattern = usePatternStore((state) => state.updatePattern);

    // uiStore selectors
    const isDeleteMode = useUIStore((state) => state.isDeleteMode);
    const isLiveMode = useUIStore((state) => state.isLiveMode);
    const showPatternSystem = useUIStore((state) => state.showPatternSystem);
    const setIsLiveMode = useUIStore((state) => state.setIsLiveMode);
    const setShowPatternSystem = useUIStore((state) => state.setShowPatternSystem);
    const togglePatternSystem = useUIStore((state) => state.togglePatternSystem);
    const toggleLiveMode = useUIStore((state) => state.toggleLiveMode);

    // pianoStore selectors
    const pianoSettings = usePianoStore((state) => state.pianoSettings);
    const availableInstruments = usePianoStore((state) => state.availableInstruments);
    const updatePianoSettings = usePianoStore((state) => state.updatePianoSettings);

    const { modes: modesFromHook } = useModes();

    // Refs for complex timing logic
    const intervalRef = useRef<number | null>(null);
    const globalStepRef = useRef<number>(0);
    const sequencerStartTimeRef = useRef<number>(0);
    const hasLoadedFromUrl = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);
    const hasInitialized = useRef(false);
    const shouldRegenerateChords = useRef(true);


    // Regenerate chords when key or mode changes
    useEffect(() => {
        if (isInitialLoad.current || !shouldRegenerateChords.current) {
            return;
        }

        // Read addedChords directly from store instead of using it as a dependency
        const currentAddedChords = usePlaybackStore.getState().addedChords;

        if (currentAddedChords.length === 0) {
            return;
        }

        const regenerateChords = async () => {
            const regeneratedChords = [];

            for (const chord of currentAddedChords) {
                try {
                    const { rootNote, chordType, slashNote } = parseChordName(chord.name);

                    console.log('Regenerating chord:', chord.name, '→ root:', rootNote, 'type:', chordType, 'slash:', slashNote);

                    const regeneratedChord: GeneratedChord | null = await dynamicChordGenerator.generateChord(
                        rootNote,
                        chordType,
                        key,
                        mode
                    );

                    if (regeneratedChord) {
                        console.log('Generated notes:', regeneratedChord.chordNoteNames);

                        // Respell notes while preserving user's custom order
                        let newNotes = respellNotesPreservingOrder(
                            chord.notes,
                            regeneratedChord.chordNoteNames
                        );
                        let newName = regeneratedChord.chordName;

                        if (slashNote) {
                            // Regenerate slash note spelling
                            const slashNoteRegenerated = await dynamicChordGenerator.generateChord(
                                slashNote,
                                '',
                                key,
                                mode
                            );

                            if (slashNoteRegenerated) {
                                const regeneratedSlashNote = slashNoteRegenerated.chordNoteNames.split(',')[0].trim();
                                newName = `${regeneratedChord.chordName}/${regeneratedSlashNote}`;

                                // Update the slash note spelling in the notes array
                                const notesArray = newNotes.split(',').map((n: string) => n.trim());
                                const slashPitch = noteToPitchClass(slashNote);

                                // Find and update the slash note in the array
                                const updatedNotes = notesArray.map((note: string) => {
                                    if (noteToPitchClass(note) === slashPitch) {
                                        return regeneratedSlashNote;
                                    }
                                    return note;
                                });

                                newNotes = updatedNotes.join(', ');
                            }
                        }

                        const finalName = updateChordNameFromNotes(chord.name, newNotes);
                        console.log('Final chord name:', chord.name, '→', finalName);

                        regeneratedChords.push({
                            ...chord,
                            name: finalName,
                            notes: newNotes,
                        });
                    } else {
                        console.warn(`Could not regenerate chord: ${chord.name} (generation returned null)`);
                        regeneratedChords.push(chord);
                    }
                } catch (error) {
                    console.error('Error regenerating chord:', chord.name, error);
                    regeneratedChords.push(chord);
                }
            }

            shouldRegenerateChords.current = false;
            setAddedChords(regeneratedChords);

            setTimeout(() => {
                shouldRegenerateChords.current = true;
            }, 100);
        };

        regenerateChords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, mode, setAddedChords]);

    useEffect(() => {
        if (modesFromHook && !hasInitialized.current) {
            hasInitialized.current = true;
            setModes(modesFromHook);

            const urlParams = new URLSearchParams(window.location.search);
            const hasUrlState = urlParams.has('s');

            if (!chords && !hasUrlState) {
                initialize();
            }
        }
    }, [modesFromHook, chords]);

    // Computed values
    const baseStepDuration = useMemo(() => {
        const quarterNoteDuration = 60000 / bpm;
        return quarterNoteDuration * subdivision;
    }, [bpm, subdivision]);

    const getSwingDuration = useCallback((stepIndex: number) => {
        if (swing === 0) return baseStepDuration;
        const isOffBeat = stepIndex % 2 === 1;
        const swingRatio = 1 + (swing / 100);
        return isOffBeat ? baseStepDuration * swingRatio : baseStepDuration / swingRatio;
    }, [baseStepDuration, swing]);

    const getCurrentPattern = useCallback(() => {
        return resolvePatternForPlayback(
            temporaryChord,
            activeChordIndex,
            addedChords,
            currentlyActivePattern
        );
    }, [temporaryChord, activeChordIndex, addedChords, currentlyActivePattern]);

    // Memoize the current chord to reduce recalculations
    const currentChord = useMemo(() => {
        if (temporaryChord) {
            return temporaryChord;
        } else if (activeChordIndex !== null && addedChords[activeChordIndex]) {
            return addedChords[activeChordIndex];
        }
        return null;
    }, [temporaryChord, activeChordIndex, addedChords]);

    // Memoize the current pattern
    const currentPattern = useMemo(() => {
        return getCurrentPattern();
    }, [getCurrentPattern]);

    // URL State Management
    const saveStateToUrl = useCallback(() => {
        if (chords?.length && modes?.length && !isInitialLoad.current) {
            encodeAndSaveToUrl(
                key,
                mode,
                addedChords,
                globalCurrentPattern,
                bpm,
                subdivision,
                swing,
                showPatternSystem,
                isLiveMode,
                pianoSettings,
                AVAILABLE_KEYS,
                modes,
                availableInstruments,
                chords,
                dynamicChordGenerator.chordTypes
            );
        }
    }, [
        key, mode, chords,
        addedChords,
        globalCurrentPattern,
        bpm,
        subdivision,
        swing,
        showPatternSystem,
        isLiveMode,
        pianoSettings,
        availableInstruments,
        modes
    ]);

    const loadStateFromUrl = useCallback(async () => {
        if (chords?.length) {
            const decoded = await loadAndDecodeFromUrl(
                AVAILABLE_KEYS,
                modes || [],
                availableInstruments,
                chords,
                dynamicChordGenerator.chordTypes
            );
            if (decoded) {
                setKeyAndMode(decoded.key, decoded.mode);

                clearAllChordsAction();
                decoded.addedChords.forEach(chord => {
                    addChord(
                        chord.name,
                        chord.notes,
                        chord.pattern || ['1', '2', '3', '4'],
                        chord.originalKey || decoded.key,
                        chord.originalMode || decoded.mode
                    );
                });

                setGlobalPatternState({
                    currentPattern: decoded.pattern,
                    bpm: decoded.bpm,
                    subdivision: decoded.subdivision,
                    swing: decoded.swing
                });

                setShowPatternSystem(decoded.showPattern);
                setIsLiveMode(decoded.liveMode);
                updatePianoSettings(decoded.pianoSettings);
            }
        }
    }, [chords, modes, availableInstruments]);

    // Complex handlers that need to coordinate between stores
    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
        if (isDeleteMode && chordIndex !== undefined) {
            removeChord(chordIndex);
            return;
        }

        const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, chordNoteNames);

        if (chordIndex !== undefined) {
            setTemporaryChord(null);
            setActiveChordIndex(chordIndex);

            if (!isPlaying) {
                playNotes(notesWithOctaves as any);
            }

            setHighlightedChordIndex(chordIndex);
            setTimeout(() => setHighlightedChordIndex(null), 150);
        } else {
            if (chordName) {
                setTemporaryChord({ name: chordName, notes: chordNoteNames });
            }

            if (!isPlaying) {
                playNotes(notesWithOctaves as any);
            }
        }
    }, [isDeleteMode, isPlaying]);

    const addChordClick = useCallback((chordName: string, chordNotes: string, key: string, mode: string) => {
        addChord(
            chordName,
            chordNotes,
            currentlyActivePattern,
            key,
            mode
        );
    }, [currentlyActivePattern]);

    const handleTogglePlayback = useCallback(() => {
        const newIsPlaying = !isPlaying;
        setGlobalPatternState({ isPlaying: newIsPlaying });

        if (newIsPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = performance.now();
        }
    }, [isPlaying]);

    const toggleScalePlayback = useCallback(() => {
        if (isPlayingScale) {
            clearScalePlaybackTimeouts();
            setActiveNotes([]);
            setIsPlayingScale(false);
            return;
        }

        if (!scaleNotes?.length) return;

        setIsPlayingScale(true);

        const wasPlaying = isPlaying;
        if (wasPlaying) {
            setGlobalPatternState({ isPlaying: false });
        }

        setActiveNotes([]);

        const quarterNoteDuration = 60000 / bpm;
        const noteDuration = quarterNoteDuration * 0.8;

        let cumulativeDelay = 100;
        let currentOctave = 4;
        let lastMidiNumber = 0;

        const scaleNotesWithTonic = [...scaleNotes];
        if (scaleNotes[0]?.noteName) {
            scaleNotesWithTonic.push({ noteName: scaleNotes[0].noteName });
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

                setActiveNotes([{ midiNote: midiNumber, note, octave }]);
            }, cumulativeDelay);

            addScalePlaybackTimeout(timeoutId);
            cumulativeDelay += noteDuration;
        });

        const finalTimeoutId = setTimeout(() => {
            setActiveNotes([]);
            setIsPlayingScale(false);
            clearScalePlaybackTimeouts();
            if (wasPlaying) {
                setGlobalPatternState({ isPlaying: true });
            }
        }, cumulativeDelay + noteDuration);

        addScalePlaybackTimeout(finalTimeoutId);
    }, [scaleNotes, isPlayingScale, bpm, isPlaying]);

    // Keyboard handlers
    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key.toLowerCase() === 'p') {
            togglePatternSystem();
            return;
        }

        if (event.key.toLowerCase() === 'l') {
            toggleLiveMode();
            return;
        }

        if (event.key === ' ') {
            event.preventDefault();
            handleTogglePlayback();
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
    }, [addedChords, handleChordClick, handleTogglePlayback, togglePatternSystem, toggleLiveMode, setTemporaryChord]);

    // Effects

    // Update currently active pattern
    useEffect(() => {
        if (activeChordIndex !== null && addedChords[activeChordIndex]) {
            setCurrentlyActivePattern([...addedChords[activeChordIndex].pattern]);
        } else {
            setCurrentlyActivePattern([...globalCurrentPattern]);
        }
    }, [activeChordIndex, addedChords, globalCurrentPattern, setCurrentlyActivePattern]);

    // Sequencer timing
    useEffect(() => {
        if (isPlaying) {
            if (!intervalRef.current) {
                sequencerStartTimeRef.current = performance.now();
                globalStepRef.current = 0;
                setGlobalPatternState({ currentStep: 0 });

                const tick = () => {
                    const now = performance.now();
                    const elapsed = now - sequencerStartTimeRef.current;

                    let totalTime = 0;
                    let calculatedStep = 0;

                    while (totalTime < elapsed) {
                        totalTime += getSwingDuration(calculatedStep);
                        if (totalTime <= elapsed) {
                            calculatedStep++;
                        }
                    }

                    if (calculatedStep !== globalStepRef.current) {
                        globalStepRef.current = calculatedStep;
                        setGlobalPatternState({ currentStep: calculatedStep });
                    }

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
    }, [isPlaying, getSwingDuration]);

    // Keep activeNotes in sync with sequencer
    useEffect(() => {
        if (!isPlaying || !currentChord) {
            return;
        }

        const currentStepIndex = currentStep % currentPattern.length;

        if (shouldPlayAtCurrentStep(currentPattern, currentStepIndex)) {
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
            setActiveNotes(notesWithOctaves as any);
        } else {
            setActiveNotes([]);
        }
    }, [
        isPlaying,
        currentStep,
        currentChord,
        currentPattern
    ]);

    // Load state from URL when chords first become available
    useEffect(() => {
        if (chords?.length && !hasLoadedFromUrl.current) {
            hasLoadedFromUrl.current = true;
            isInitialLoad.current = true;

            loadStateFromUrl().then(() => {
                setTimeout(() => {
                    isInitialLoad.current = false;
                }, 100);
            });
        }
    }, [chords, loadStateFromUrl]);

    // Save state to URL when relevant state changes
    useEffect(() => {
        if (chords?.length && modes?.length && !isInitialLoad.current) {
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
        key, mode, addedChords,
        globalCurrentPattern,
        bpm,
        subdivision,
        swing,
        showPatternSystem,
        isLiveMode,
        pianoSettings,
        chords?.length,
        modes?.length,
        saveStateToUrl
    ]);

    // Keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    // Return only what you're using
    return {
        isLiveMode,
        handleChordClick,
        addChordClick,
    };
};

/**
 * Minimal hook for App.tsx that only subscribes to what's needed for rendering.
 * This prevents unnecessary re-renders when sequencer state changes.
 * 
 * CRITICAL: This hook uses NO subscriptions except isLiveMode. All other state
 * is read directly via getState() in callbacks to avoid triggering re-renders.
 */
export const useAppState = () => {
    // Only subscribe to isLiveMode for rendering - nothing else!
    const isLiveMode = useUIStore((state) => state.isLiveMode);

    // Get stable action references (these never change, so no re-renders)
    const removeChord = usePlaybackStore((state) => state.removeChord);
    const setTemporaryChord = usePlaybackStore((state) => state.setTemporaryChord);
    const setActiveChordIndex = usePlaybackStore((state) => state.setActiveChordIndex);
    const playNotes = usePlaybackStore((state) => state.playNotes);
    const setHighlightedChordIndex = usePlaybackStore((state) => state.setHighlightedChordIndex);
    const addChord = usePlaybackStore((state) => state.addChord);

    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
        // Read state directly without subscribing
        const isDeleteMode = useUIStore.getState().isDeleteMode;
        const isPlaying = usePatternStore.getState().globalPatternState.isPlaying;

        if (isDeleteMode && chordIndex !== undefined) {
            removeChord(chordIndex);
            return;
        }

        const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, chordNoteNames);

        if (chordIndex !== undefined) {
            setTemporaryChord(null);
            setActiveChordIndex(chordIndex);

            if (!isPlaying) {
                playNotes(notesWithOctaves as any);
            }

            setHighlightedChordIndex(chordIndex);
            setTimeout(() => setHighlightedChordIndex(null), 150);
        } else {
            if (chordName) {
                setTemporaryChord({ name: chordName, notes: chordNoteNames });
            }

            if (!isPlaying) {
                playNotes(notesWithOctaves as any);
            }
        }
    }, [removeChord, setTemporaryChord, setActiveChordIndex, playNotes, setHighlightedChordIndex]);

    const addChordClick = useCallback((chordName: string, chordNotes: string, key: string, mode: string) => {
        // Read state directly without subscribing
        const currentlyActivePattern = usePatternStore.getState().currentlyActivePattern;

        addChord(
            chordName,
            chordNotes,
            currentlyActivePattern,
            key,
            mode
        );
    }, [addChord]);

    return {
        isLiveMode,
        handleChordClick,
        addChordClick,
    };
};