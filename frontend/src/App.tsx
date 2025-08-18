import { PlayCircleIcon } from '@heroicons/react/20/solid';
import { useAppState } from './hooks/useAppState';
import ChordTable from './components/ChordTable';
import Dropdown from './components/Dropdown';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/ChordNavigation';
import './App.css';

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
        showPatternSystem,
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
        setShowPatternSystem,
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