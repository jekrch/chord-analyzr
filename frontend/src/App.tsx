import { useAppState } from './hooks/useAppState';
import ChordTable from './components/ChordTable';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/ChordNavigation';
import PianoControlPanel from './components/piano/PianoControlPanel';
import HeaderNav from './components/HeaderNav';
import './App.css';
import { useEffect, useRef } from 'react';

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
        // Handlers
        setKey,
        setMode,
        setIsDeleteMode,

        setIsLiveMode,
        setAvailableInstruments,
        handleChordClick,
        addChordClick,
        updateChord,         // NEW: Add the updateChord handler
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
    } = useAppState();

    const silentAudioRef = useRef<HTMLAudioElement>(null)
    const audioInitializedRef = useRef(false)

    // audio initialization
    const initializeAudio = async () => {
        if (!audioInitializedRef.current) {
            try {
                // for ios, we need to play silent audio first
                await silentAudioRef.current?.play()

                audioInitializedRef.current = true

                // cleanup listeners after successful initialization
                document.removeEventListener('touchstart', initializeAudio)
                document.removeEventListener('mousedown', initializeAudio)
                document.removeEventListener('click', initializeAudio)
            } catch (error) {
                console.error('failed to initialize audio:', error)
            }
        }
    }

    useEffect(() => {
        // event listeners for user interaction
        document.addEventListener('touchstart', initializeAudio)
        document.addEventListener('mousedown', initializeAudio)
        document.addEventListener('click', initializeAudio)

        // cleanup event listeners on unmount
        return () => {
            document.removeEventListener('touchstart', initializeAudio)
            document.removeEventListener('mousedown', initializeAudio)
            document.removeEventListener('click', initializeAudio)
        }
    }, [])


    // ========== RENDER ==========
    return (
        <div className="select-none text-center bg-[#282c34] min-h-screen">
            {/* Silent audio element for iOS compatibility */}
            <audio ref={silentAudioRef} preload="auto">
              <source src="/silence.mp3" type="audio/mp3" />
            </audio>

            {/* Header Navigation */}
            <HeaderNav 
                globalPatternState={globalPatternState}
                isLiveMode={isLiveMode}
                keySignature={key}
                mode={mode}
            />

            <div className={`mt-2 flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6 pb-24 ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>

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
                        onVolumeChange={setVolume}               // Add this
                        onChorusLevelChange={setChorusLevel}     // Add this
                        onDelayLevelChange={setDelayLevel}       // Add this
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
                    setVolume={setVolume}             
                    setChorusLevel={setChorusLevel}      
                    setDelayLevel={setDelayLevel}       
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
                    <div className="w-full px-2 mx-auto items-center">
                        <div className="px-6 py-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700 w-full max-w-7xl mx-auto">
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
                onUpdateChord={updateChord} 
                onFetchOriginalChord={handleFetchOriginalChord}
            />
        </div>
    );
}

export default App;