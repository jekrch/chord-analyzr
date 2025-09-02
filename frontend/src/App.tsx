import React, { useEffect, useRef } from 'react';
import { useIntegratedAppLogic } from './hooks/useIntegratedAppLogic';
import ChordTable from './components/ChordTable';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/ChordNavigation';
import PianoControlPanel from './components/piano/PianoControlPanel';
import HeaderNav from './components/HeaderNav';
import './App.css';
import SequenceStatusView from './components/SequenceStatusView';

function App() {
    const {
        // State
        chords,
        loadingChords,
        isLiveMode,
        
        // Handlers
        handleChordClick,
        addChordClick,
    } = useIntegratedAppLogic();

    const silentAudioRef = useRef<HTMLAudioElement>(null);
    const audioInitializedRef = useRef(false);

    // Audio initialization (unchanged)
    const initializeAudio = async () => {
        if (!audioInitializedRef.current) {
            try {
                await silentAudioRef.current?.play();
                audioInitializedRef.current = true;
                document.removeEventListener('touchstart', initializeAudio);
                document.removeEventListener('mousedown', initializeAudio);
                document.removeEventListener('click', initializeAudio);
            } catch (error) {
                console.error('failed to initialize audio:', error);
            }
        }
    };

    useEffect(() => {
        document.addEventListener('touchstart', initializeAudio);
        document.addEventListener('mousedown', initializeAudio);
        document.addEventListener('click', initializeAudio);

        return () => {
            document.removeEventListener('touchstart', initializeAudio);
            document.removeEventListener('mousedown', initializeAudio);
            document.removeEventListener('click', initializeAudio);
        };
    }, []);

    // Rest of the component remains exactly the same
    return (
        <div className="select-none text-center bg-[#282c34] min-h-screen">
            <audio ref={silentAudioRef} preload="auto">
                <source src="/silence.mp3" type="audio/mp3" />
            </audio>

            <HeaderNav />

            <div className={`mt-2 flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6 pb-24 ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>

                <div className="w-full max-w-7xl">
                    <PianoControl hideConfigControls={true} />
                </div>

                <PianoControlPanel/>

                <PatternSystem/>

                <SequenceStatusView />

                <div className="w-full max-w-7xl mb-20 mt-2">
                    <ChordTable
                        onChordClick={handleChordClick}
                        addChordClick={addChordClick}
                    />
                </div>
            </div>

            <ChordNavigation/>
        </div>
    );
}

export default App;