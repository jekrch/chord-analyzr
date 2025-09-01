import React, { useState, useRef, useCallback } from 'react';
import { PlayCircleIcon, PauseIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import Dropdown from '../Dropdown';
import { Button } from '../Button';
import { useMusicStore } from '../../stores/musicStore';
import { usePianoStore } from '../../stores/pianoStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { usePatternStore } from '../../stores/patternStore';

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

// Optional props interface for backwards compatibility
interface PianoControlPanelProps {
    // All props are optional - stores will be used by default
    className?: string;
    // You can still override specific behaviors if needed
    onKeyChange?: (key: string) => void;
    onModeChange?: (mode: string) => void;
    onInstrumentChange?: (instrument: string) => void;
}

const PianoControlPanel: React.FC<PianoControlPanelProps> = ({
    className = "",
    onKeyChange,
    onModeChange,
    onInstrumentChange
}) => {
    // Get data from stores with stable selectors (separate subscriptions to avoid object recreation)
    const currentKey = useMusicStore(state => state.key);
    const mode = useMusicStore(state => state.mode);
    const modes = useMusicStore(state => state.modes);
    const scaleNotes = useMusicStore(state => state.scaleNotes);
    
    const pianoSettings = usePianoStore(state => state.pianoSettings);
    const availableInstruments = usePianoStore(state => state.availableInstruments);
    
    const isPlayingScale = usePlaybackStore(state => state.isPlayingScale);
    const globalPatternState = usePatternStore(state => state.globalPatternState);

    // Get store actions
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
    
    // Get scale playback toggle from playback store
    const { setIsPlayingScale, clearScalePlaybackTimeouts, setActiveNotes } = usePlaybackStore();

    // Local state for piano settings panel
    const [settingsOpen, setSettingsOpen] = useState(false);
    
    // Refs for managing scale playback
    const scaleTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const scalePlaybackRef = useRef<boolean>(false);

    // Handler for instrument change
    const handleInstrumentChange = (value: string) => {
        const instrumentName = value.replaceAll(' ', '_');
        if (onInstrumentChange) {
            onInstrumentChange(instrumentName);
        } else {
            setPianoInstrument(instrumentName);
        }
    };

    // Handler for key change
    const handleKeyChange = (key: string) => {
        if (onKeyChange) {
            onKeyChange(key);
        } else {
            setKey(key);
        }
    };

    // Handler for mode change
    const handleModeChange = (mode: string) => {
        if (onModeChange) {
            onModeChange(mode);
        } else {
            setMode(mode);
        }
    };

    // Clear all scale playback timeouts
    const clearScaleTimeouts = useCallback(() => {
        scaleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        scaleTimeoutsRef.current = [];
        scalePlaybackRef.current = false;
    }, []);

    // Calculate note duration based on BPM
    const calculateNoteDuration = useCallback((bpm: number) => {
        // Quarter note duration in milliseconds
        const quarterNoteDuration = 60000 / bpm;
        // Use eighth notes for scale playback (faster)
        return quarterNoteDuration / 2;
    }, []);

    // Play scale with proper timing
    const playScale = useCallback(() => {
        if (!scaleNotes || scaleNotes.length === 0) {
            console.warn('No scale notes available to play');
            return;
        }

        // Clear any existing timeouts
        clearScaleTimeouts();
        
        // Use BPM from pattern store, fallback to 120
        const bpm = globalPatternState?.bpm || 120;
        const noteDuration = calculateNoteDuration(bpm);
        
        scalePlaybackRef.current = true;
        setIsPlayingScale(true);

        // Create note objects for the scale (starting from octave 4)
        const scaleNotesForPlayback = scaleNotes.map((scaleNote) => ({
            note: scaleNote.noteName || 'C',
            octave: 4
        }));

        // Add the root note an octave higher to complete the scale
        if (scaleNotes.length > 0) {
            scaleNotesForPlayback.push({
                note: scaleNotes[0].noteName || 'C',
                octave: 5
            });
        }

        // Play each note in sequence
        scaleNotesForPlayback.forEach((noteObj, index) => {
            const timeout = setTimeout(() => {
                if (!scalePlaybackRef.current) return;
                
                // Set the active note
                setActiveNotes([noteObj]);
                
                // Clear the note after a portion of the duration
                const noteOffTimeout = setTimeout(() => {
                    if (!scalePlaybackRef.current) return;
                    setActiveNotes([]);
                }, noteDuration * 0.8); // Note off after 80% of duration
                
                scaleTimeoutsRef.current.push(noteOffTimeout);
                
                // If this is the last note, end the scale playback
                if (index === scaleNotesForPlayback.length - 1) {
                    const endTimeout = setTimeout(() => {
                        if (scalePlaybackRef.current) {
                            stopScale();
                        }
                    }, noteDuration);
                    scaleTimeoutsRef.current.push(endTimeout);
                }
            }, index * noteDuration);
            
            scaleTimeoutsRef.current.push(timeout);
        });
    }, [scaleNotes, globalPatternState, setIsPlayingScale, setActiveNotes, clearScaleTimeouts, calculateNoteDuration]);

    // Stop scale playback
    const stopScale = useCallback(() => {
        clearScaleTimeouts();
        setActiveNotes([]);
        setIsPlayingScale(false);
        if (clearScalePlaybackTimeouts) {
            clearScalePlaybackTimeouts();
        }
    }, [clearScaleTimeouts, setActiveNotes, setIsPlayingScale, clearScalePlaybackTimeouts]);

    // Integrated scale playback toggle
    const toggleScalePlayback = useCallback(() => {
        if (isPlayingScale || scalePlaybackRef.current) {
            stopScale();
        } else {
            playScale();
        }
    }, [isPlayingScale, playScale, stopScale]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            clearScaleTimeouts();
        };
    }, [clearScaleTimeouts]);

    return (
        <div className={`w-full max-w-7xl mx-auto px-2 sm:mt-4 mt-0 mb-2 ${className}`}>
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

                {/* Main Controls Content - Stable Layout */}
                <div className="p-6 py-4 bg-[#444b59]">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-center gap-6">
                        {/* Desktop: Centered container with internal separators */}
                        <div className="hidden xl:flex items-center bg-[#3d434f]/30 border border-gray-600/30 rounded-lg px-6 py-4">
                            {/* Key Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Key:</span>
                                <div className="flex items-center gap-2">
                                    <Dropdown
                                        value={currentKey}
                                        className='w-[5rem]'
                                        buttonClassName='px-3 py-1.5 text-center font-medium text-xs h-10 flex items-center justify-center'
                                        menuClassName='min-w-[5rem]'
                                        onChange={handleKeyChange}
                                        showSearch={false}
                                        options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                    />
                                    <Button
                                        onClick={toggleScalePlayback}
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
                            <div className="w-px h-8 bg-gray-600/50 mx-8"></div>

                            {/* Mode Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Mode:</span>
                                {modes && (
                                    <Dropdown
                                        value={mode}
                                        className='w-[11rem]'
                                        buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                        menuClassName='min-w-[11rem]'
                                        onChange={handleModeChange}
                                        showSearch={true}
                                        options={modes}
                                    />
                                )}
                            </div>

                            {/* Separator */}
                            <div className="w-px h-8 bg-gray-600/50 mx-8"></div>

                            {/* Voice Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Voice:</span>
                                <Dropdown
                                    value={pianoSettings.instrumentName.replaceAll('_', ' ')}
                                    className='w-[14rem]'
                                    buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                    menuClassName='min-w-[11rem]'
                                    onChange={handleInstrumentChange}
                                    showSearch={true}
                                    options={availableInstruments.map((name) => name.replaceAll('_', ' '))}
                                />
                            </div>
                        </div>

                        {/* Mobile: Stack vertically */}
                        <div className="xl:hidden space-y-4">
                            {/* Key Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap w-16 flex items-center">Key:</span>
                                <div className="flex items-center gap-2">
                                    <Dropdown
                                        value={currentKey}
                                        className='w-[6em]'
                                        buttonClassName='px-3 py-1.5 text-center font-medium text-xs h-10 flex items-center justify-center'
                                        menuClassName='min-w-[6rem]'
                                        onChange={handleKeyChange}
                                        showSearch={false}
                                        options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                    />
                                    <Button
                                        onClick={toggleScalePlayback}
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

                            {/* Mode Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap w-16 flex items-center">Mode:</span>
                                {modes && (
                                    <Dropdown
                                        value={mode}
                                        className='w-[14rem]'
                                        buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                        menuClassName='min-w-[14rem]'
                                        onChange={handleModeChange}
                                        showSearch={true}
                                        options={modes}
                                    />
                                )}
                            </div>

                            {/* Voice Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap w-16 flex items-center">Voice:</span>
                                <Dropdown
                                    value={pianoSettings.instrumentName.replaceAll('_', ' ')}
                                    className='w-[14rem]'
                                    buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                    menuClassName='min-w-[11rem]'
                                    onChange={handleInstrumentChange}
                                    showSearch={true}
                                    options={availableInstruments.map((name) => name.replaceAll('_', ' '))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expandable Piano Settings - Bottom Section */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${settingsOpen ? ' opacity-100' : 'max-h-0 opacity-0'
                    }`}>
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
                                    <div>
                                        <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                                            Volume<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(pianoSettings.volume * 100)}%)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1.0"
                                                step="0.05"
                                                value={pianoSettings.volume}
                                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                            />
                                        </div>
                                    </div>

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

                                    <div>
                                        <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                                            Reverb<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(pianoSettings.reverbLevel * 100)}%)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1.0"
                                                step="0.05"
                                                value={pianoSettings.reverbLevel}
                                                onChange={(e) => setReverbLevel(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                                            Note Duration<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(pianoSettings.noteDuration * 100)}%)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1.0"
                                                step="0.05"
                                                value={pianoSettings.noteDuration}
                                                onChange={(e) => setNoteDuration(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                            />
                                        </div>
                                    </div>

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
                                        <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Equalizer</label>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Bass', key: 'bass' as keyof EqSettings },
                                                { label: 'Mid', key: 'mid' as keyof EqSettings },
                                                { label: 'Treble', key: 'treble' as keyof EqSettings }
                                            ].map(({ label, key }) => (
                                                <div key={key}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{pianoSettings.eq[key] > 0 ? '+' : ''}{pianoSettings.eq[key].toFixed(1)}dB</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        name={key}
                                                        min="-24"
                                                        max="24"
                                                        step="0.5"
                                                        value={pianoSettings.eq[key]}
                                                        onChange={(e) => {
                                                            const newEq = { ...pianoSettings.eq, [key]: parseFloat(e.target.value) };
                                                            setEq(newEq);
                                                        }}
                                                        className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                                                Chorus<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(pianoSettings.chorusLevel * 100)}%)</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1.0"
                                                    step="0.05"
                                                    value={pianoSettings.chorusLevel}
                                                    onChange={(e) => setChorusLevel(parseFloat(e.target.value))}
                                                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                                                Delay<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(pianoSettings.delayLevel * 100)}%)</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1.0"
                                                    step="0.05"
                                                    value={pianoSettings.delayLevel}
                                                    onChange={(e) => setDelayLevel(parseFloat(e.target.value))}
                                                    className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb"
                                                />
                                            </div>
                                        </div>
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