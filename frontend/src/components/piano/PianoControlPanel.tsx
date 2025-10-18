import React, { useState, useRef, useCallback } from 'react';
import { PlayCircleIcon, PauseIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import Dropdown from '../Dropdown';
import { Button } from '../Button';
import Slider from '../Slider';
import { calculateTransposeSteps, transposeChordName, transposeNotes } from '../../stores/playbackStore';
import { usePianoStore } from '../../stores/pianoStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { usePatternStore } from '../../stores/patternStore';
import { normalizeNoteName } from '../../util/NoteUtil';
import { dataService } from '../../services/DataService';
import { useMusicStore } from '../../stores/musicStore';
import Logo from '../Logo';

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

interface PianoControlPanelProps {
    className?: string;
    onKeyChange?: (key: string) => void;
    onModeChange?: (mode: string) => void;
    onInstrumentChange?: (instrument: string) => void;
}

// Extract chord transpose logic into reusable function
const useChordTranspose = () => {
    const transposeChords = useCallback(async (
        fromKey: string, 
        fromMode: string, 
        toKey: string, 
        toMode: string
    ) => {
        console.log('Transposing from', fromKey, fromMode, 'to', toKey, toMode);
        
        const currentAddedChords = usePlaybackStore.getState().addedChords;
        console.log('Current chords to transpose:', currentAddedChords.length);
        
        if (currentAddedChords.length === 0) return;

        // Calculate transpose steps (only needed when key changes)
        const steps = fromKey !== toKey ? calculateTransposeSteps(fromKey, toKey) : 0;
        
        // Fetch new music data and all distinct chords
        const [newChords, allChords] = await Promise.all([
            dataService.getModeKeyChords(toKey, toMode),
            dataService.getAllDistinctChords()
        ]);
        
        // Transform each chord
        const transformedChords = currentAddedChords.map((chord: any) => {
            // Get target chord name (transpose if key changed)
            const targetChordName = steps !== 0 ? transposeChordName(chord.name, steps) : chord.name;
            
            // Find matching chord in new key/mode, then in all chords
            let matchingChord = newChords.find(c => c.chordName === targetChordName) ||
                               allChords.find(c => c.chordName === targetChordName);
            
            if (!matchingChord) {
                console.log(`Chord ${targetChordName} not in ${toKey} ${toMode}, found in all chords:`, false);
            }
            
            if (matchingChord?.chordNoteNames) {
                return {
                    ...chord,
                    name: targetChordName,
                    notes: matchingChord.chordNoteNames,
                    originalKey: toKey,
                    originalMode: toMode,
                    originalNotes: matchingChord.chordNoteNames
                };
            } else {
                // Manually transpose notes if chord not found
                console.log(`Chord ${targetChordName} not found, manually transposing notes`);
                const transformedNotes = steps !== 0 ? transposeNotes(chord.notes, steps) : chord.notes;
                return {
                    ...chord,
                    name: targetChordName,
                    notes: transformedNotes,
                    originalNotes: chord.originalNotes ? 
                        (steps !== 0 ? transposeNotes(chord.originalNotes, steps) : chord.originalNotes) : 
                        transformedNotes
                };
            }
        });
        
        // Update the playback store
        usePlaybackStore.getState().setAddedChords(transformedChords);
        console.log('Transpose complete');
    }, []);

    return { transposeChords };
};

// Reusable control group component
interface ControlGroupProps {
    currentKey: string;
    mode: string;
    modes: string[];
    pianoSettings: any;
    availableInstruments: string[];
    isPlayingScale: boolean;
    scaleNotes: any[];
    transposeEnabled: boolean;
    isDesktop?: boolean;
    onKeyChange: (key: string) => void;
    onModeChange: (mode: string) => void;
    onInstrumentChange: (instrument: string) => void;
    onToggleTranspose: () => void;
    onToggleScalePlayback: () => void;
}

const ControlGroup: React.FC<ControlGroupProps> = ({
    currentKey,
    mode,
    modes,
    pianoSettings,
    availableInstruments,
    isPlayingScale,
    scaleNotes,
    transposeEnabled,
    isDesktop = false,
    onKeyChange,
    onModeChange,
    onInstrumentChange,
    onToggleTranspose,
    onToggleScalePlayback
}) => {
    const commonDropdownClasses = {
        key: isDesktop ? 'w-[5rem]' : 'w-[6em]',
        mode: isDesktop ? 'w-[11rem]' : 'w-[14rem]',
        voice: 'w-[14rem]'
    };

    const containerClass = isDesktop ? 
        "flex flex-col bg-[#3d434f]/30 border border-gray-600/30 rounded-lg px-6 py-4" :
        "space-y-4";

    const separatorClass = isDesktop ? "w-px h-8 bg-gray-600/50 mx-8" : "hidden";
    const labelClass = isDesktop ? 
        "text-sm text-slate-300 font-medium whitespace-nowrap" : 
        "text-sm text-slate-300 font-medium whitespace-nowrap w-16 flex items-center";

    const supportedKeys = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

    if (isDesktop) {
        return (
            <div className={containerClass}>
                {/* First Row - All Dropdowns Aligned */}
                <div className="flex items-center">
                    {/* Key Control Group */}
                    <div className="flex items-center gap-3">
                        <span className={labelClass}>Key:</span>
                        <div className="flex items-center gap-2">
                            <Dropdown
                                value={currentKey}
                                className={commonDropdownClasses.key}
                                buttonClassName='px-3 py-1.5 text-center font-medium text-xs h-10 flex items-center justify-center'
                                menuClassName={`min-w-[${commonDropdownClasses.key}]`}
                                onChange={onKeyChange}
                                showSearch={false}
                                options={supportedKeys}
                            />
                            <Button
                                onClick={onToggleScalePlayback}
                                variant="play-stop"
                                size="icon"
                                className="!w-8 !h-8 flex items-center justify-center ml-1"
                                active={isPlayingScale}
                                title={isPlayingScale ? 'Stop scale' : `Play ${currentKey} ${mode} scale`}
                                disabled={!scaleNotes || scaleNotes.length === 0}
                            >
                                {isPlayingScale ? (
                                    <PauseIcon className="w-6 h-6" />
                                ) : (
                                    <PlayCircleIcon className="w-6 h-6" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className={separatorClass}></div>

                    {/* Mode Control Group */}
                    <div className="flex items-center gap-3">
                        <span className={labelClass}>Mode:</span>
                        {modes && (
                            <Dropdown
                                value={mode}
                                className={commonDropdownClasses.mode}
                                buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                menuClassName={`min-w-[${commonDropdownClasses.mode}]`}
                                onChange={onModeChange}
                                showSearch={true}
                                options={modes}
                            />
                        )}
                    </div>

                    {/* Separator */}
                    <div className={separatorClass}></div>

                    {/* Voice Control Group */}
                    <div className="flex items-center gap-3">
                        <span className={labelClass}>Voice:</span>
                        <Dropdown
                            value={pianoSettings.instrumentName.replaceAll('_', ' ')}
                            className={commonDropdownClasses.voice}
                            buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                            menuClassName='min-w-[11rem]'
                            onChange={onInstrumentChange}
                            showSearch={true}
                            options={availableInstruments.map((name) => name.replaceAll('_', ' '))}
                        />
                    </div>
                </div>

                {/* Second Row - Transpose Button (aligned under Key section) */}
                <div className="flex items-start mt-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300 font-medium whitespace-nowrap invisible">Key:</span>
                        <button
                            onClick={onToggleTranspose}
                            className={`relative flex items-center justify-center px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all duration-200 border ${
                                transposeEnabled 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg shadow-blue-600/25' 
                                    : 'bg-[#3d434f] text-slate-400 border-gray-600 hover:bg-[#4a5262] hover:text-slate-300'
                            }`}
                            title="When enabled, changing key or mode will transpose all added chords"
                        >
                            <div className={`flex items-center gap-2 ${transposeEnabled ? 'text-white' : ''}`}>
                                <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                    transposeEnabled ? 'bg-white' : 'bg-slate-500'
                                }`} />
                                <span>Transpose</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile layout (unchanged)
    return (
        <div className={containerClass}>
            {/* Key Control Group */}
            <div className="flex items-start gap-3">
                <span className={`${labelClass} mt-2`}>Key:</span>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Dropdown
                            value={currentKey}
                            className={commonDropdownClasses.key}
                            buttonClassName='px-3 py-1.5 text-center font-medium text-xs h-10 flex items-center justify-center'
                            menuClassName={`min-w-[6rem]`}
                            onChange={onKeyChange}
                            showSearch={false}
                            options={supportedKeys}
                        />
                        <Button
                            onClick={onToggleScalePlayback}
                            variant="play-stop"
                            size="icon"
                            className="!w-8 !h-8 flex items-center justify-center ml-1"
                            active={isPlayingScale}
                            title={isPlayingScale ? 'Stop scale' : `Play ${currentKey} ${mode} scale`}
                            disabled={!scaleNotes || scaleNotes.length === 0}
                        >
                            {isPlayingScale ? (
                                <PauseIcon className="w-6 h-6" />
                            ) : (
                                <PlayCircleIcon className="w-6 h-6" />
                            )}
                        </Button>
                    </div>
                    <button
                        onClick={onToggleTranspose}
                        className={`relative flex items-center justify-center px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all duration-200 border max-w-[13em] ${
                            transposeEnabled 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg shadow-blue-600/25' 
                                : 'bg-[#3d434f] text-slate-400 border-gray-600 hover:bg-[#4a5262] hover:text-slate-300'
                        }`}
                        title="When enabled, changing key or mode will transpose all added chords"
                    >
                        <div className={`flex items-center gap-2 ${transposeEnabled ? 'text-white' : ''}`}>
                            <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                transposeEnabled ? 'bg-white' : 'bg-slate-500'
                            }`} />
                            <span>Transpose</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Mode Control Group */}
            <div className="flex items-center gap-3">
                <span className={labelClass}>Mode:</span>
                {modes && (
                    <Dropdown
                        value={mode}
                        className={commonDropdownClasses.mode}
                        buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                        menuClassName={`min-w-[${commonDropdownClasses.mode}]`}
                        onChange={onModeChange}
                        showSearch={true}
                        options={modes}
                    />
                )}
            </div>

            {/* Voice Control Group */}
            <div className="flex items-center gap-3">
                <span className={labelClass}>Voice:</span>
                <Dropdown
                    value={pianoSettings.instrumentName.replaceAll('_', ' ')}
                    className={commonDropdownClasses.voice}
                    buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                    menuClassName='min-w-[11rem]'
                    onChange={onInstrumentChange}
                    showSearch={true}
                    options={availableInstruments.map((name) => name.replaceAll('_', ' '))}
                />
            </div>
        </div>
    );
};

const getNoteValueFromNoteName = (noteName: string, octave: number = 4): number => {
    const noteMap: { [key: string]: number } = {
        'C': 0, 'C#': 1, 'Db': 1,
        'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11
    };
    return (octave + 1) * 12 + (noteMap[noteName] ?? 0);
};

const PianoControlPanel: React.FC<PianoControlPanelProps> = ({
    className = "",
    onKeyChange,
    onModeChange,
    onInstrumentChange
}) => {
    // Store subscriptions
    const currentKey = useMusicStore(state => state.key);
    const mode = useMusicStore(state => state.mode);
    const modes = useMusicStore(state => state.modes);
    const scaleNotes = useMusicStore(state => state.scaleNotes);

    const pianoSettings = usePianoStore(state => state.pianoSettings);
    const availableInstruments = usePianoStore(state => state.availableInstruments);

    const isPlayingScale = usePlaybackStore(state => state.isPlayingScale);
    const globalPatternState = usePatternStore(state => state.globalPatternState);

    // Store actions
    const { setKey, setMode } = useMusicStore();
    const {
        setPianoInstrument,
        setCutOffPreviousNotes,
        setEq,
        setOctaveOffset,
        setReverbLevel,
        setNoteDuration,
        setVolume,
        setChorusLevel,
        setDelayLevel
    } = usePianoStore();
    const { setIsPlayingScale, clearScalePlaybackTimeouts, setActiveNotes } = usePlaybackStore();

    // Local state
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [transposeEnabled, setTransposeEnabled] = useState(false);

    // Custom hook for transpose functionality
    const { transposeChords } = useChordTranspose();

    // Refs for scale playback
    const scaleTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const scalePlaybackRef = useRef<boolean>(false);

    // Unified handlers
    const handleInstrumentChange = (value: string) => {
        const instrumentName = value.replaceAll(' ', '_');
        if (onInstrumentChange) {
            onInstrumentChange(instrumentName);
        } else {
            setPianoInstrument(instrumentName);
        }
    };

    const handleKeyChange = async (key: string) => {
        if (onKeyChange) {
            onKeyChange(key);
        } else if (transposeEnabled) {
            await transposeChords(currentKey, mode, key, mode);
            setKey(key);
        } else {
            setKey(key);
        }
    };

    const handleModeChange = async (newMode: string) => {
        if (onModeChange) {
            onModeChange(newMode);
        } else if (transposeEnabled) {
            await transposeChords(currentKey, mode, currentKey, newMode);
            setMode(newMode);
        } else {
            setMode(newMode);
        }
    };

    // Scale playback functionality (keeping original implementation)
    const clearScaleTimeouts = useCallback(() => {
        scaleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        scaleTimeoutsRef.current = [];
        scalePlaybackRef.current = false;
    }, []);

    const calculateNoteDuration = useCallback((bpm: number) => {
        const quarterNoteDuration = 60000 / bpm;
        return quarterNoteDuration / 2;
    }, []);

    const playScale = useCallback(() => {
        if (!scaleNotes || scaleNotes.length === 0) {
            console.warn('No scale notes available to play');
            return;
        }

        clearScaleTimeouts();
        const bpm = globalPatternState?.bpm || 120;
        const noteDuration = calculateNoteDuration(bpm);

        scalePlaybackRef.current = true;
        setIsPlayingScale(true);

        // [Rest of playScale implementation remains the same...]
        const scaleNotesWithFinalNote = [...scaleNotes];
        if (scaleNotes.length > 0) {
            const rootNote = scaleNotes[0];
            scaleNotesWithFinalNote.push({
                ...rootNote,
                seqNote: rootNote.seqNote ? rootNote.seqNote + 12 : undefined
            });
        }

        const sortedScaleNotes = scaleNotesWithFinalNote
            .map((scaleNote) => {
                const noteName = normalizeNoteName(scaleNote.noteName) || 'C';
                const octave = 4;
                const sortValue = scaleNote.seqNote ? scaleNote.seqNote : getNoteValueFromNoteName(noteName, octave);
                return { note: noteName, octave: octave, sortValue: sortValue };
            })
            .sort((a, b) => a.sortValue - b.sortValue);

        const getNoteIndex = (noteName: string): number => {
            const noteMap: { [key: string]: number } = {
                'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
                'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
                'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
            };
            return noteMap[noteName] ?? 0;
        };

        const scaleNotesForPlayback = [];
        let currentOctave = 4;
        let previousNoteIndex = -1;

        for (let i = 0; i < sortedScaleNotes.length; i++) {
            const currentNote = sortedScaleNotes[i];
            const currentNoteIndex = getNoteIndex(currentNote.note);

            if (previousNoteIndex !== -1 && previousNoteIndex === 11 && currentNoteIndex <= 11 && currentNoteIndex < previousNoteIndex) {
                currentOctave++;
            } else if (previousNoteIndex !== -1 && currentNoteIndex < previousNoteIndex && !(previousNoteIndex === 11 && currentNoteIndex === 0)) {
                currentOctave++;
            }

            scaleNotesForPlayback.push({ note: currentNote.note, octave: currentOctave });
            previousNoteIndex = currentNoteIndex;
        }

        scaleNotesForPlayback.forEach((noteObj, index) => {
            const timeout = setTimeout(() => {
                if (!scalePlaybackRef.current) return;
                //console.log(noteObj);
                setActiveNotes([noteObj]);

                const noteOffTimeout = setTimeout(() => {
                    if (!scalePlaybackRef.current) return;
                    setActiveNotes([]);
                }, noteDuration * 0.8);
                scaleTimeoutsRef.current.push(noteOffTimeout);

                if (index === scaleNotesForPlayback.length - 1) {
                    const endTimeout = setTimeout(() => {
                        if (scalePlaybackRef.current) stopScale();
                    }, noteDuration);
                    scaleTimeoutsRef.current.push(endTimeout);
                }
            }, index * noteDuration);
            scaleTimeoutsRef.current.push(timeout);
        });
    }, [scaleNotes, globalPatternState, setIsPlayingScale, setActiveNotes, clearScaleTimeouts, calculateNoteDuration]);

    const stopScale = useCallback(() => {
        clearScaleTimeouts();
        setActiveNotes([]);
        setIsPlayingScale(false);
        if (clearScalePlaybackTimeouts) {
            clearScalePlaybackTimeouts();
        }
    }, [clearScaleTimeouts, setActiveNotes, setIsPlayingScale, clearScalePlaybackTimeouts]);

    const toggleScalePlayback = useCallback(() => {
        if (isPlayingScale || scalePlaybackRef.current) {
            stopScale();
        } else {
            playScale();
        }
    }, [isPlayingScale, playScale, stopScale]);

    React.useEffect(() => {
        return () => clearScaleTimeouts();
    }, [clearScaleTimeouts]);

    return (
        <div className={`w-full max-w-7xl mx-auto px-2 sm:mt-2 mt-0 mb-0 ${className}`}>
            <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden">
                {/* Main Controls Header */}
                <div className="px-4 py-3 border-b border-gray-600">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Controls</h2>
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className="w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
                        >
                            {settingsOpen ? (
                                <>
                                    <ChevronUpIcon className="w-3 h-3" />
                                    <span>Settings</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDownIcon className="w-3 h-3" />
                                    <span>Settings</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Controls Content */}
                <div className="p-6 py-4 bg-[#444b59]">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6">
                        {/* Desktop Layout */}
                        <div className="hidden lg:flex items-center justify-between w-full">
                            {/* Left Logo */}
                            <div className="flex-shrink-0 opacity-30">
                                <Logo size={80} />
                            </div>
                            
                            {/* Centered Controls */}
                            <div className="flex-shrink-0">
                                <ControlGroup
                                    currentKey={currentKey}
                                    mode={mode}
                                    modes={modes}
                                    pianoSettings={pianoSettings}
                                    availableInstruments={availableInstruments}
                                    isPlayingScale={isPlayingScale}
                                    scaleNotes={scaleNotes}
                                    transposeEnabled={transposeEnabled}
                                    isDesktop={true}
                                    onKeyChange={handleKeyChange}
                                    onModeChange={handleModeChange}
                                    onInstrumentChange={handleInstrumentChange}
                                    onToggleTranspose={() => setTransposeEnabled(!transposeEnabled)}
                                    onToggleScalePlayback={toggleScalePlayback}
                                />
                            </div>
                            
                            {/* Right Logo */}
                            <div className="hidden [@media(min-width:72em)]:flex flex-shrink-0 opacity-30">
                                <Logo size={80} />
                            </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="lg:hidden">
                            <ControlGroup
                                currentKey={currentKey}
                                mode={mode}
                                modes={modes}
                                pianoSettings={pianoSettings}
                                availableInstruments={availableInstruments}
                                isPlayingScale={isPlayingScale}
                                scaleNotes={scaleNotes}
                                transposeEnabled={transposeEnabled}
                                isDesktop={false}
                                onKeyChange={handleKeyChange}
                                onModeChange={handleModeChange}
                                onInstrumentChange={handleInstrumentChange}
                                onToggleTranspose={() => setTransposeEnabled(!transposeEnabled)}
                                onToggleScalePlayback={toggleScalePlayback}
                            />
                        </div>
                    </div>
                </div>

                {/* Expandable Piano Settings */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${settingsOpen ? ' opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="border-t border-gray-600 bg-[#3d434f]">
                        <div className="px-4 py-3 border-b border-gray-600">
                            <h3 className="text-left text-sm font-medium text-slate-200 uppercase tracking-wider">
                                Piano Settings
                            </h3>
                        </div>

                        <div className="p-6 bg-[#444b59]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    <Slider
                                        label="Volume"
                                        value={pianoSettings.volume}
                                        min={0}
                                        max={1.0}
                                        step={0.05}
                                        onChange={setVolume}
                                        showPercentage={true}
                                    />

                                    <div>
                                        <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Octave Shift</label>
                                        <div className="flex items-center justify-between bg-[#3d434f] border border-gray-600 rounded-md p-1.5">
                                            <button
                                                onClick={() => setOctaveOffset(Math.max(-3, pianoSettings.octaveOffset - 1))}
                                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors"
                                                disabled={pianoSettings.octaveOffset <= -3}
                                            >
                                                −
                                            </button>
                                            <span className="font-mono text-xs text-slate-200 px-2">
                                                {pianoSettings.octaveOffset === 0 ? 'Normal' : `${pianoSettings.octaveOffset > 0 ? '+' : ''}${pianoSettings.octaveOffset} octave${Math.abs(pianoSettings.octaveOffset) > 1 ? 's' : ''}`}
                                            </span>
                                            <button
                                                onClick={() => setOctaveOffset(Math.min(3, pianoSettings.octaveOffset + 1))}
                                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors"
                                                disabled={pianoSettings.octaveOffset >= 3}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <Slider
                                        label="Reverb"
                                        value={pianoSettings.reverbLevel}
                                        min={0}
                                        max={1.0}
                                        step={0.05}
                                        onChange={setReverbLevel}
                                        showPercentage={true}
                                    />

                                    <Slider
                                        label="Note Duration"
                                        value={pianoSettings.noteDuration}
                                        min={0.1}
                                        max={1.0}
                                        step={0.05}
                                        onChange={setNoteDuration}
                                        showPercentage={true}
                                    />

                                    <div>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 text-blue-600 bg-[#3d434f] border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                                                checked={pianoSettings.cutOffPreviousNotes}
                                                onChange={(e) => setCutOffPreviousNotes(e.target.checked)}
                                            />
                                            <span className="ml-2 text-xs text-slate-300 uppercase tracking-wide">Cut off previous notes</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Right Column - Equalizer and Effects */}
                                <div className="space-y-4 mt-6 lg:mt-0">
                                    <div>
                                        <div className="text-xs font-medium text-slate-200 mb-4 uppercase tracking-wide">Equalizer</div>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Bass', key: 'bass' as keyof EqSettings },
                                                { label: 'Mid', key: 'mid' as keyof EqSettings },
                                                { label: 'Treble', key: 'treble' as keyof EqSettings }
                                            ].map(({ label, key }) => (
                                                <Slider
                                                    key={key}
                                                    label={label}
                                                    value={pianoSettings.eq[key]}
                                                    min={-24}
                                                    max={24}
                                                    step={0.5}
                                                    variant="split"
                                                    onChange={(value) => {
                                                        const newEq = { ...pianoSettings.eq, [key]: value };
                                                        setEq(newEq);
                                                    }}
                                                    formatValue={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}dB`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Slider
                                            label="Chorus"
                                            value={pianoSettings.chorusLevel}
                                            min={0}
                                            max={1.0}
                                            step={0.05}
                                            onChange={setChorusLevel}
                                            showPercentage={true}
                                        />

                                        <Slider
                                            label="Delay"
                                            value={pianoSettings.delayLevel}
                                            min={0}
                                            max={1.0}
                                            step={0.05}
                                            onChange={setDelayLevel}
                                            showPercentage={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PianoControlPanel;