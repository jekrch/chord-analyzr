import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAppState } from './hooks/useIntegratedAppLogic';
import EffectsManager from './EffectsManager';
import ChordTable from './components/ChordTable';
import PianoControl, { PianoDisplayModeBar } from './components/piano/PianoControl';
import { useUIStore } from './stores/uiStore';
import PatternSystem from './components/PatternSystem';
import ChordNavigation from './components/chordNav/ChordNavigation';
import PianoControlPanel from './components/piano/PianoControlPanel';
import HeaderNav from './components/HeaderNav';
import './App.css';
import './themes.css';
import SequenceStatusView from './components/SequenceStatusView';
import SongSheetPage from './components/songs/SongSheetPage';
import { useHashRoute } from './hooks/useHashRoute';

// Keyboard/score display with an optional pin-to-top. The mode bar above it
// stays in normal flow, so only the display sticks. A sentinel just above the
// sticky wrapper scrolls out of the container at the moment the wrapper pins
// (same approach as ChordTable's filter panels), triggering the floating
// elevation. Isolated in its own component so the uiStore subscription
// doesn't re-render App.
const PinnablePianoSection: React.FC = () => {
    const pinKeyboardDisplay = useUIStore(state => state.pinKeyboardDisplay);
    const [isPinStuck, setIsPinStuck] = useState(false);
    const pinSentinelRef = useRef<HTMLDivElement>(null);
    const pinWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!pinKeyboardDisplay) {
            setIsPinStuck(false);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => setIsPinStuck(!entry.isIntersecting),
            { threshold: 0 }
        );
        if (pinSentinelRef.current) observer.observe(pinSentinelRef.current);
        return () => observer.disconnect();
    }, [pinKeyboardDisplay]);

    // Publish the pinned display's height so sticky elements further down
    // (ChordTable's filter panels) can stop below it instead of sliding under
    useEffect(() => {
        const setPinnedDisplayHeight = useUIStore.getState().setPinnedDisplayHeight;
        const el = pinWrapperRef.current;
        if (!pinKeyboardDisplay || !el) {
            setPinnedDisplayHeight(0);
            return;
        }
        const update = () => setPinnedDisplayHeight(el.offsetHeight);
        update();
        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(el);
        return () => {
            resizeObserver.disconnect();
            setPinnedDisplayHeight(0);
        };
    }, [pinKeyboardDisplay]);

    return (
        <>
            <div className="w-full max-w-7xl">
                <PianoDisplayModeBar />
            </div>
            <div ref={pinSentinelRef} className="w-full" />
            <div ref={pinWrapperRef} className={`w-full max-w-7xl mb-3 ${pinKeyboardDisplay ? 'sticky top-0 z-70 bg-mcb-app pt-3 mcb-pinned-display' : ''} ${isPinStuck ? 'mcb-pinned-display--floating' : ''}`}>
                <PianoControl hideConfigControls={true} />
            </div>
        </>
    );
};

function App() {
    // Use the minimal hook for rendering - only subscribes to isLiveMode
    const {
        isLiveMode,
        handleChordClick,
        addChordClick,
    } = useAppState();

    // The main view stays mounted (display:none) while on #/songs so the
    // piano audio sink, sequencer and all main-page state keep working.
    const [route] = useHashRoute();
    const onSongsPage = route === 'songs';

    const silentAudioRef = useRef<HTMLAudioElement>(null);
    const audioInitializedRef = useRef(false);
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    const [isMobileWidth, setIsMobileWidth] = useState(false);
    const lastHeaderScrollsState = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // viewport check with scroll restoration; the header scrolls with content
    // (instead of staying pinned) when the viewport is short or mobile-width
    const checkHeight = useCallback(() => {
        const vh = window.innerHeight;
        const em = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const newIsCompact = vh < 35 * em;
        const newIsMobile = window.innerWidth < 640;
        setIsCompactHeight(newIsCompact);
        setIsMobileWidth(newIsMobile);

        const newHeaderScrolls = newIsCompact || newIsMobile;
        if (newHeaderScrolls !== lastHeaderScrollsState.current) {
            lastHeaderScrollsState.current = newHeaderScrolls;

            // Force scroll container refresh after state change
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.style.overflow = 'hidden';
                    // Force reflow
                    void scrollContainerRef.current.offsetHeight;
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
                    void container.offsetHeight;
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
    }, [isCompactHeight, isMobileWidth]);

    const headerScrollsWithContent = isCompactHeight || isMobileWidth;

    // Audio initialization 
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
        <div className="select-none text-center bg-mcb-app min-h-screen h-screen w-screen overflow-hidden flex flex-col">
            {/* Invisible component that runs all effects without causing App re-renders */}
            <EffectsManager />
            
            <audio ref={silentAudioRef} preload="auto">
                <source src="/silence.mp3" type="audio/mp3" />
            </audio>

            {/* HeaderNav - fixed on desktop, scrollable on mobile / compact height */}
            {!headerScrollsWithContent && (
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
                {/* HeaderNav inside scroll area for mobile / compact mode */}
                {headerScrollsWithContent && (
                    <div className="flex-shrink-0">
                        <HeaderNav />
                    </div>
                )}

                <div className={`${onSongsPage ? 'hidden' : 'flex'} flex-col items-center justify-start text-[calc(10px+2vmin)] text-white px-3 pt-3 pb-32 ${isLiveMode ? 'pointer-events-none opacity-30' : ''}`}>
                    <PinnablePianoSection />

                    <PianoControlPanel/>

                    <PatternSystem/>

                    <SequenceStatusView className="mt-3" />

                    <div className="w-full max-w-7xl mb-20 mt-3">
                        <ChordTable
                            onChordClick={handleChordClick}
                            addChordClick={addChordClick}
                        />
                    </div>
                </div>

                {onSongsPage && <SongSheetPage />}
            </div>

            {/* ChordNavigation - always fixed at bottom */}
            <div className={onSongsPage ? 'hidden' : 'flex-shrink-0'}>
                <ChordNavigation/>
            </div>
        </div>
    );
}

export default App;