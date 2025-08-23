import { PlayCircleIcon, Cog6ToothIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { useAppState } from './hooks/useAppState';
import ChordTable from './components/ChordTable';
import Dropdown from './components/Dropdown';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/ChordNavigation';
import InputLabel from './components/InputLabel';
import './App.css';
import { Button, ChordButton } from './components/Button';

function App() {
    // ========== CUSTOM HOOK ==========
    const {
        // State
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

        // Refs
        silentAudioRef,

        // Handlers
        setKey,
        setMode,
        setIsDeleteMode,

        setIsLiveMode,
        setAvailableInstruments,
        handleChordClick,
        addChordClick,
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
    } = useAppState();

    // Local state for piano settings panel
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Handler for instrument change
    const handleInstrumentChange = (value: string) => {
        const instrumentName = value.replaceAll(' ', '_');
        setPianoInstrument(instrumentName);
    };

    // ========== RENDER ==========
    return (
        <div className="text-center bg-[#282c34] min-h-screen pb-24">
            {/* Silent audio element for iOS compatibility */}
            <audio ref={silentAudioRef} preload="auto" muted>
                <source src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQA" type="audio/wav" />
            </audio>

            <div className={`flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6 ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>

                {/* Header Controls */}
                <div className="flex items-center justify-center space-x-6 pt-6">
                    <div className="text-xs text-gray-400 text-center">
                        <div>Press 'L' to expand piano | Space to play/pause</div>
                        <div>1-9 for chords | Click sequencer header to show/hide</div>
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
                        // Piano settings props
                        pianoSettings={pianoSettings}
                        availableInstruments={availableInstruments}
                        onInstrumentChange={setPianoInstrument}
                        onCutOffPreviousNotesChange={setCutOffPreviousNotes}
                        onEqChange={setEq}
                        onOctaveOffsetChange={setOctaveOffset}
                        onReverbLevelChange={setReverbLevel}
                        onNoteDurationChange={setNoteDuration}
                        onAvailableInstrumentsChange={setAvailableInstruments}
                        // Hide the original config controls since we're moving them here
                        hideConfigControls={true}
                    />
                </div>


                {/* Unified Control Panel - Key/Mode/Voice Controls with Expandable Settings */}
                <div className="w-full max-w-7xl mx-auto px-2 sm:mt-4 mt-0 mb-2">
                    <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden">
                        {/* Main Controls Header */}
                        <div className="px-4 py-3 border-b border-gray-600">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Controls</h2>
                                <button
                                    onClick={() => setSettingsOpen(!settingsOpen)}
                                    className="w-[7em] flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
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

                        {/* Main Controls Content - Responsive Grid */}
                        <div className="p-6 bg-[#444b59]">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-6 md:gap-8">
                                {/* Key Control Group */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Key:</span>
                                    <div className="flex items-center gap-2">
                                        <Dropdown
                                            value={key}
                                            className='w-[5rem]'
                                            buttonClassName='px-3 py-2 text-center font-medium'
                                            menuClassName='min-w-[5rem]'
                                            onChange={setKey}
                                            showSearch={false}
                                            options={['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                                        />
                                        <Button
                                            onClick={playScaleNotes}
                                            variant="success"
                                            size="sm"
                                            className="h-10"
                                            disabled={isPlayingScale}
                                            active={isPlayingScale}
                                            title={isPlayingScale ? 'Playing scale...' : 'Play scale'}
                                        >
                                            <PlayCircleIcon className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Mode Control Group */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Mode:</span>
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

                                {/* Voice Control Group */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300 font-medium whitespace-nowrap">Voice:</span>
                                    <Dropdown
                                        value={pianoSettings.instrumentName.replaceAll('_', ' ')}
                                        className='w-[14rem]'
                                        buttonClassName='px-3 py-2 text-left font-medium'
                                        menuClassName='min-w-[11rem]'
                                        onChange={handleInstrumentChange}
                                        showSearch={true}
                                        options={availableInstruments.map((name) => name.replaceAll('_', ' '))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Expandable Piano Settings - Bottom Section */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${settingsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                            <div className="border-t border-gray-600 bg-[#3d434f]">
                                <div className="px-4 py-3 border-b border-gray-600">
                                    <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
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
                                                        { label: 'Bass', key: 'bass' as keyof typeof pianoSettings.eq },
                                                        { label: 'Mid', key: 'mid' as keyof typeof pianoSettings.eq },
                                                        { label: 'Treble', key: 'treble' as keyof typeof pianoSettings.eq }
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