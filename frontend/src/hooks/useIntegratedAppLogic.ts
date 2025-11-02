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

export const useIntegratedAppLogic = () => {

    // musicStore selectors
    const chords = useMusicStore((state) => state.chords);
    const key = useMusicStore((state) => state.key);
    const mode = useMusicStore((state) => state.mode);
    const modes = useMusicStore((state) => state.modes);
    const scaleNotes = useMusicStore((state) => state.scaleNotes);
    const normalizedScaleNotes = useMusicStore((state) => state.normalizedScaleNotes);
    const loadingChords = useMusicStore((state) => state.loadingChords);
    const setKey = useMusicStore((state) => state.setKey);
    const setMode = useMusicStore((state) => state.setMode);
    const setKeyAndMode = useMusicStore((state) => state.setKeyAndMode);
    const setModes = useMusicStore((state) => state.setModes);
    const initialize = useMusicStore((state) => state.initialize);

    // playbackStore selectors
    const activeNotes = usePlaybackStore((state) => state.activeNotes);
    const activeChordIndex = usePlaybackStore((state) => state.activeChordIndex);
    const highlightedChordIndex = usePlaybackStore((state) => state.highlightedChordIndex);
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
    const updateChord = usePlaybackStore((state) => state.updateChord);
    const setAddedChords = usePlaybackStore((state) => state.setAddedChords);
    const clearAllChordsAction = usePlaybackStore((state) => state.clearAllChords);
    const updateChordPattern = usePlaybackStore((state) => state.updateChordPattern);
    const playNotes = usePlaybackStore((state) => state.playNotes);
    const clearScalePlaybackTimeouts = usePlaybackStore((state) => state.clearScalePlaybackTimeouts);
    const addScalePlaybackTimeout = usePlaybackStore((state) => state.addScalePlaybackTimeout);
    const handleFetchOriginalChord = usePlaybackStore((state) => state.handleFetchOriginalChord);

    // patternStore selectors
    const globalPatternState = usePatternStore((state) => state.globalPatternState);
    const isPlaying = usePatternStore((state) => state.globalPatternState.isPlaying); // Individual selector for stable reference
    const bpm = usePatternStore((state) => state.globalPatternState.bpm); // Individual selector for stable reference
    const currentlyActivePattern = usePatternStore((state) => state.currentlyActivePattern);
    const setGlobalPatternState = usePatternStore((state) => state.setGlobalPatternState);
    const setCurrentlyActivePattern = usePatternStore((state) => state.setCurrentlyActivePattern);
    const updatePattern = usePatternStore((state) => state.updatePattern);

    // uiStore selectors
    const isDeleteMode = useUIStore((state) => state.isDeleteMode);
    const isLiveMode = useUIStore((state) => state.isLiveMode);
    const showPatternSystem = useUIStore((state) => state.showPatternSystem);
    const setIsDeleteMode = useUIStore((state) => state.setIsDeleteMode);
    const setIsLiveMode = useUIStore((state) => state.setIsLiveMode);
    const setShowPatternSystem = useUIStore((state) => state.setShowPatternSystem);
    const togglePatternSystem = useUIStore((state) => state.togglePatternSystem);
    const toggleLiveMode = useUIStore((state) => state.toggleLiveMode);

    // pianoStore selectors
    const pianoSettings = usePianoStore((state) => state.pianoSettings);
    const availableInstruments = usePianoStore((state) => state.availableInstruments);
    const setPianoInstrument = usePianoStore((state) => state.setPianoInstrument);
    const setCutOffPreviousNotes = usePianoStore((state) => state.setCutOffPreviousNotes);
    const setEq = usePianoStore((state) => state.setEq);
    const setOctaveOffset = usePianoStore((state) => state.setOctaveOffset);
    const setReverbLevel = usePianoStore((state) => state.setReverbLevel);
    const setNoteDuration = usePianoStore((state) => state.setNoteDuration);
    const setVolume = usePianoStore((state) => state.setVolume);
    const setChorusLevel = usePianoStore((state) => state.setChorusLevel);
    const setDelayLevel = usePianoStore((state) => state.setDelayLevel);
    const setDistortionLevel = usePianoStore((state) => state.setDistortionLevel);
    const setBitcrusherLevel = usePianoStore((state) => state.setBitcrusherLevel);
    const setPhaserLevel = usePianoStore((state) => state.setPhaserLevel);
    const setFlangerLevel = usePianoStore((state) => state.setFlangerLevel);
    const setRingModLevel = usePianoStore((state) => state.setRingModLevel);
    const setAutoFilterLevel = usePianoStore((state) => state.setAutoFilterLevel);
    const setTremoloLevel = usePianoStore((state) => state.setTremoloLevel);
    const setStereoWidthLevel = usePianoStore((state) => state.setStereoWidthLevel);
    const setCompressorLevel = usePianoStore((state) => state.setCompressorLevel);
    const updatePianoSettings = usePianoStore((state) => state.updatePianoSettings);
    const setAvailableInstruments = usePianoStore((state) => state.setAvailableInstruments);

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

        if (addedChords.length === 0) {
            return;
        }

        const regenerateChords = async () => {
            const regeneratedChords = [];

            for (const chord of addedChords) {
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
                        
                        let newNotes = regeneratedChord.chordNoteNames;
                        let newName = regeneratedChord.chordName;

                        if (slashNote) {
                            ({ newName, newNotes } = await regenerateSlashNote(slashNote, newName, regeneratedChord, newNotes, key, mode));
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
    }, [key, mode, addedChords, setAddedChords]);

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
    }, [modesFromHook, chords]); // FIXED: Removed actions from dependencies

    // Computed values
    const baseStepDuration = useMemo(() => {
        const quarterNoteDuration = 60000 / globalPatternState.bpm;
        return quarterNoteDuration * globalPatternState.subdivision;
    }, [globalPatternState.bpm, globalPatternState.subdivision]);

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
                globalPatternState.currentPattern,
                globalPatternState.bpm,
                globalPatternState.subdivision,
                globalPatternState.swing,
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
        globalPatternState.currentPattern,
        globalPatternState.bpm,
        globalPatternState.subdivision,
        globalPatternState.swing,
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
    }, [chords, modes, availableInstruments]); // FIXED: Removed all actions from dependencies

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
    }, [isDeleteMode, isPlaying]); // FIXED: Removed Zustand actions from dependencies

    const addChordClick = useCallback((chordName: string, chordNotes: string, key: string, mode: string) => {
        addChord(
            chordName,
            chordNotes,
            currentlyActivePattern,
            key,
            mode
        );
    }, [currentlyActivePattern]); // FIXED: Removed Zustand action from dependencies

    const updateChordWithFallbacks = useCallback((chordIndex: number, updatedChord: any) => {
        const normalizedChord = {
            name: updatedChord.name,
            notes: updatedChord.notes,
            pattern: updatedChord.pattern || ['1', '2', '3', '4'],
            originalKey: updatedChord.originalKey || key,
            originalMode: updatedChord.originalMode || mode,
            originalNotes: updatedChord.originalNotes || updatedChord.notes
        };

        updateChord(chordIndex, normalizedChord);
    }, [key, mode, updateChord]);

    const reorderChords = useCallback((sourceIndex: number, destinationIndex: number) => {
        const currentChords = Array.from(addedChords);
        const [removed] = currentChords.splice(sourceIndex, 1);
        currentChords.splice(destinationIndex, 0, removed);

        setAddedChords(currentChords);

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
            setActiveChordIndex(newActiveIndex);
        }
    }, [addedChords, activeChordIndex, setAddedChords, setActiveChordIndex]);

    const clearAllChords = useCallback(() => {
        clearAllChordsAction();
        setGlobalPatternState({ isPlaying: false });
        setIsLiveMode(false);
    }, [clearAllChordsAction, setGlobalPatternState, setIsLiveMode]);

    const handlePatternChange = useCallback((newPatternState: Partial<any>) => {
        updatePattern(newPatternState);

        if (newPatternState.hasOwnProperty('isPlaying') && newPatternState.isPlaying) {
            globalStepRef.current = 0;
            sequencerStartTimeRef.current = performance.now();
        }
    }, [updatePattern]);

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
    }, [scaleNotes, isPlayingScale, bpm, isPlaying]); // FIXED: Removed actions from dependencies

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
            setCurrentlyActivePattern([...globalPatternState.currentPattern]);
        }
    }, [activeChordIndex, addedChords, globalPatternState.currentPattern]); // FIXED: Removed action from dependencies

    // Sequencer timing
    useEffect(() => {
        if (globalPatternState.isPlaying) {
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
    }, [globalPatternState.isPlaying, getSwingDuration]); // FIXED: Removed action from dependencies

    // Keep activeNotes in sync with sequencer
    useEffect(() => {
        if (!globalPatternState.isPlaying || !currentChord) {
            return;
        }

        const currentStepIndex = globalPatternState.currentStep % currentPattern.length;

        if (shouldPlayAtCurrentStep(currentPattern, currentStepIndex)) {
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, currentChord.notes);
            setActiveNotes(notesWithOctaves as any);
        } else {
            setActiveNotes([]);
        }
    }, [
        globalPatternState.isPlaying,
        globalPatternState.currentStep,
        currentChord,
        currentPattern
    ]); // FIXED: Removed action from dependencies

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
        globalPatternState.currentPattern,
        globalPatternState.bpm,
        globalPatternState.subdivision,
        globalPatternState.swing,
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

    // Return a consolidated interface
    return {
        // State from stores
        chords,
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
        isLiveMode,
        globalPatternState,
        currentlyActivePattern,
        temporaryChord,
        normalizedScaleNotes,
        pianoSettings,
        availableInstruments,

        // Handlers that coordinate between stores
        setKey,
        setMode,
        setIsDeleteMode,
        setIsLiveMode,
        setAvailableInstruments,
        handleChordClick,
        addChordClick,
        updateChord: updateChordWithFallbacks,
        reorderChords,
        clearAllChords,
        updateChordPattern,
        toggleScalePlayback,
        handlePatternChange,
        handleTogglePlayback,
        getCurrentPattern,
        handleFetchOriginalChord,

        // Piano settings handlers
        setPianoInstrument,
        setCutOffPreviousNotes,
        setEq,
        setOctaveOffset,
        setReverbLevel,
        setNoteDuration,
        setVolume,
        setChorusLevel,
        setDelayLevel,
        setDistortionLevel,
        setBitcrusherLevel,
        setPhaserLevel,
        setFlangerLevel,
        setRingModLevel,
        setAutoFilterLevel,
        setTremoloLevel,
        setStereoWidthLevel,
        setCompressorLevel,
    };
};