import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useIntegratedAppLogic } from './hooks/useIntegratedAppLogic';
import ChordTable from './components/ChordTable';
import PianoControl from './components/piano/PianoControl';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/chordNav/ChordNavigation';
import PianoControlPanel from './components/piano/PianoControlPanel';
import HeaderNav from './components/HeaderNav';
import './App.css';
import SequenceStatusView from './components/SequenceStatusView';

function App() {
    const {
        // State
        isLiveMode,
        
        // Handlers
        handleChordClick,
        addChordClick,
    } = useIntegratedAppLogic();

    const silentAudioRef = useRef<HTMLAudioElement>(null);
    const audioInitializedRef = useRef(false);
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    const lastCompactState = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Optimized height check with scroll restoration
    const checkHeight = useCallback(() => {
        const vh = window.innerHeight;
        const em = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const newIsCompact = vh < 35 * em;
        
        if (newIsCompact !== lastCompactState.current) {
            lastCompactState.current = newIsCompact;
            setIsCompactHeight(newIsCompact);
            
            // Force scroll container refresh after state change
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.style.overflow = 'hidden';
                    // Force reflow
                    scrollContainerRef.current.offsetHeight;
                    scrollContainerRef.current.style.overflow = 'auto';
                }
            }, 50);
        }
    }, []);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        
        const throttledCheck = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(checkHeight, 100);
        };

        // Special handler for orientation changes that can break scroll
        const handleOrientationChange = () => {
            // Delay to let the browser finish orientation change
            setTimeout(() => {
                checkHeight();
                // Force scroll container refresh on mobile after orientation change
                if (scrollContainerRef.current && /Mobi|Android/i.test(navigator.userAgent)) {
                    const container = scrollContainerRef.current;
                    container.style.overflowY = 'hidden';
                    container.style.touchAction = 'pan-y';
                    // Force reflow
                    container.offsetHeight;
                    container.style.overflowY = 'auto';
                    (container.style as any).WebkitOverflowScrolling = 'touch';
                }
            }, 250);
        };

        checkHeight();
        window.addEventListener('resize', throttledCheck, { passive: true });
        window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', throttledCheck);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, [checkHeight]);

    // Ensure proper scroll behavior on mount and state changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // Ensure scroll properties are properly set
            (container.style as any).WebkitOverflowScrolling = 'touch';
            container.style.touchAction = 'pan-y';
            container.style.overscrollBehavior = 'contain';
        }
    }, [isCompactHeight]);

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

    return (
        <div className="select-none text-center bg-[#282c34] min-h-screen h-screen w-screen overflow-hidden flex flex-col">
            <audio ref={silentAudioRef} preload="auto">
                <source src="/silence.mp3" type="audio/mp3" />
            </audio>

            {/* HeaderNav - fixed in normal mode, scrollable in compact mode */}
            {!isCompactHeight && (
                <div className="flex-shrink-0">
                    <HeaderNav />
                </div>
            )}

            {/* Main scrollable content */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto flex flex-col"
                style={{
                    WebkitOverflowScrolling: 'touch' as any,
                    touchAction: 'pan-y',
                    overscrollBehavior: 'contain'
                }}
            >
                {/* HeaderNav inside scroll area for compact mode */}
                {isCompactHeight && (
                    <div className="flex-shrink-0">
                        <HeaderNav />
                    </div>
                )}

                <div className={`flex flex-col items-center justify-start text-[calc(10px+2vmin)] text-white p-4 space-y-6 pb-32 ${!isCompactHeight ? 'mt-2' : ''} ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>
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
            </div>

            {/* ChordNavigation - always fixed at bottom */}
            <div className="flex-shrink-0">
                <ChordNavigation/>
            </div>
        </div>
    );
}

export default App;