import { useAppState } from './hooks/useAppState';
import ChordTable from './components/ChordTable';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/ChordNavigation';
import PianoControlPanel from './components/piano/PianoControlPanel';
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
        toggleScalePlayback,
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
        <div className="select-none text-center bg-[#282c34] min-h-screen pb-24">
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

                {/* Piano Control Panel - Key/Mode/Voice Controls with Expandable Settings */}
                <PianoControlPanel
                    currentKey={key}
                    mode={mode}
                    modes={modes}
                    isPlayingScale={isPlayingScale}
                    pianoSettings={pianoSettings}
                    availableInstruments={availableInstruments}
                    setKey={setKey}
                    setMode={setMode}
                    toggleScalePlayback={toggleScalePlayback}
                    setPianoInstrument={setPianoInstrument}
                    setCutOffPreviousNotes={setCutOffPreviousNotes}
                    setEq={setEq}
                    setOctaveOffset={setOctaveOffset}
                    setReverbLevel={setReverbLevel}
                    setNoteDuration={setNoteDuration}
                />

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
                <div className="w-full max-w-7xl mb-20 mt-2">
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