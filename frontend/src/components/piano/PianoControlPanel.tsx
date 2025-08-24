import React, { useState } from 'react';
import { PlayCircleIcon, PauseIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import Dropdown from '../Dropdown';
import { Button } from '../Button';

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

interface PianoSettings {
    instrumentName: string;
    octaveOffset: number;
    reverbLevel: number;
    noteDuration: number;
    cutOffPreviousNotes: boolean;
    eq: EqSettings;
}

interface PianoControlPanelProps {
    // Key/Mode/Voice props
    currentKey: string;
    mode: string;
    modes: string[] | undefined;
    isPlayingScale: boolean;
    pianoSettings: PianoSettings;
    availableInstruments: string[];
    
    // Handlers
    setKey: (key: string) => void;
    setMode: (mode: string) => void;
    toggleScalePlayback: () => void;
    setPianoInstrument: (instrument: string) => void;
    setCutOffPreviousNotes: (cutOff: boolean) => void;
    setEq: (eq: EqSettings) => void;
    setOctaveOffset: (offset: number) => void;
    setReverbLevel: (level: number) => void;
    setNoteDuration: (duration: number) => void;
}

const PianoControlPanel: React.FC<PianoControlPanelProps> = ({
    // Key/Mode/Voice props
    currentKey,
    mode,
    modes,
    isPlayingScale,
    pianoSettings,
    availableInstruments,
    
    // Handlers
    setKey,
    setMode,
    toggleScalePlayback,
    setPianoInstrument,
    setCutOffPreviousNotes,
    setEq,
    setOctaveOffset,
    setReverbLevel,
    setNoteDuration,
}) => {
    // Local state for piano settings panel
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Handler for instrument change
    const handleInstrumentChange = (value: string) => {
        const instrumentName = value.replaceAll(' ', '_');
        setPianoInstrument(instrumentName);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:mt-4 mt-0 mb-2">
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
                <div className="p-6 bg-[#444b59]">
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
                                        onChange={setKey}
                                        showSearch={false}
                                        options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                    />
                                    <Button
                                        onClick={toggleScalePlayback}
                                        variant="play-stop"
                                        size="icon"
                                        className="!w-8 !h-8 flex items-center justify-center ml-1"
                                        active={isPlayingScale}
                                        title={isPlayingScale ? 'Stop scale' : 'Play scale'}
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
                                        onChange={setMode}
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
                        <div className="xl:hidden space-y-6">
                            {/* Key Control Group */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 font-medium whitespace-nowrap w-16 flex items-center">Key:</span>
                                <div className="flex items-center gap-2">
                                    <Dropdown
                                        value={currentKey}
                                        className='w-[5rem]'
                                        buttonClassName='px-3 py-1.5 text-center font-medium text-xs h-10 flex items-center justify-center'
                                        menuClassName='min-w-[5rem]'
                                        onChange={setKey}
                                        showSearch={false}
                                        options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                    />
                                    <Button
                                        onClick={toggleScalePlayback}
                                        variant="play-stop"
                                        size="icon"
                                        className="!w-8 !h-8 flex items-center justify-center ml-1"
                                        active={isPlayingScale}
                                        title={isPlayingScale ? 'Stop scale' : 'Play scale'}
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
                                        className='w-[11rem]'
                                        buttonClassName='px-3 py-1.5 text-left font-medium text-xs h-10 flex items-center'
                                        menuClassName='min-w-[11rem]'
                                        onChange={setMode}
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

                                {/* Right Column - Equalizer */}
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