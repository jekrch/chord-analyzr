import React from 'react';
import { TrashIcon, XCircleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, StopIcon, PauseIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Button, ChordButton } from './Button'; // Updated import

interface AddedChord {
    name: string;
    notes: string;
    pattern: string[]; 
}

interface GlobalPatternState {
    currentPattern: string[]; 
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}

interface ChordNavigationProps {
    addedChords: AddedChord[];
    activeChordIndex: number | null;
    highlightedChordIndex: number | null;
    isDeleteMode: boolean;
    isLiveMode: boolean;
    globalPatternState: GlobalPatternState;
    onChordClick: (notes: string, index: number) => void;
    onClearAll: () => void;
    onToggleDeleteMode: () => void;
    onToggleLiveMode: () => void;
    onTogglePlayback: () => void;
}

const ChordNavigation: React.FC<ChordNavigationProps> = ({
    addedChords,
    activeChordIndex,
    highlightedChordIndex,
    isDeleteMode,
    isLiveMode,
    globalPatternState,
    onChordClick,
    onClearAll,
    onToggleDeleteMode,
    onToggleLiveMode,
    onTogglePlayback
}) => {
    if (addedChords.length === 0) return null;

    const baseClasses = isLiveMode 
        ? "fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col"
        : "fixed bottom-0 left-0 right-0 bg-[#1e2329] border-t border-gray-600 shadow-2xl z-50";

    return (
        <div className={baseClasses}>
            {/* Header */}
            <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? 'py-3' : 'py-2'} w-full`}>
                <div className={`flex items-center justify-between ${isLiveMode ? 'mb-2' : 'mb-1'}`}>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                            Chords
                        </div>
                        {!isLiveMode && (
                            <Button
                                onClick={onTogglePlayback}
                                variant="icon"
                                size="icon"
                                className=""
                                active={globalPatternState.isPlaying}
                                title={globalPatternState.isPlaying ? "Stop" : "Play"}
                            >
                                {globalPatternState.isPlaying ? (
                                    <PauseIcon className="w-4 h-4" />
                                ) : (
                                    <PlayIcon className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        {isLiveMode && (
                            <Button
                                onClick={onTogglePlayback}
                                variant="play-stop"
                                size="sm"
                                active={globalPatternState.isPlaying}
                                className="shadow-lg pr-4.5"
                            >
                                {globalPatternState.isPlaying ? (
                                    <>
                                        <PauseIcon className="w-4 h-4" />
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <PlayCircleIcon className="w-4 h-4" />
                                        Play
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <Button
                            onClick={onToggleLiveMode}
                            variant="primary"
                            size="sm"
                            active={isLiveMode}
                            className="py-1.5 px-3 text-xs h-7"
                        >
                            {isLiveMode ? (
                                <>
                                    <ArrowsPointingInIcon className="h-3 w-3" />
                                    Collapse
                                </>
                            ) : (
                                <>
                                    <ArrowsPointingOutIcon className="h-3 w-3" />
                                    Expand
                                </>
                            )}
                        </Button>
                        {!isLiveMode && (
                            <>
                                <Button
                                    onClick={() => {
                                        if (isLiveMode)
                                            onToggleLiveMode();
                                        onClearAll(); 
                                    }}
                                    variant="primary"
                                    size="sm"
                                    className="py-1.5 px-3 text-xs h-7"
                                >
                                    Clear
                                </Button>
                                <Button
                                    onClick={onToggleDeleteMode}
                                    variant={isDeleteMode ? "danger" : "primary"}
                                    size="sm"
                                    active={isDeleteMode}
                                    className="py-1.5 px-3 text-xs h-7 w-[7em]"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                    {isDeleteMode ? 'Done' : 'Delete'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Live Mode Info */}
                {isLiveMode && (
                    <div className="text-center text-gray-400 text-sm mb-4">
                        <div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div>
                        <div className="text-xs mt-1">
                            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                            Active Chord
                        </div>
                    </div>
                )}
            </div>

            {/* Chord Buttons */}
            <div className={`flex-1 max-w-7xl mx-auto px-4 w-full ${isLiveMode ? 'pb-8 overflow-y-auto pt-2' : 'pb-2 pt-0'}`}>
                <div className={
                    isLiveMode 
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max"
                        : "flex space-x-2 overflow-x-auto pb-2 chord-sequence-scroll"
                }>
                    {addedChords.map((chord, index) => {
                        const isActive = index === activeChordIndex;
                        const isHighlighted = index === highlightedChordIndex;

                        return (
                            <ChordButton
                                key={index}
                                onClick={() => onChordClick(chord.notes, index)}
                                variant={isDeleteMode ? "danger" : "primary"}
                                active={isActive && !isDeleteMode}
                                aria-label={`Pattern: ${chord.pattern.join('-')}`}
                                className={classNames(
                                    'relative',
                                    {
                                        // Live mode styles
                                        'py-8 px-6 text-lg min-h-[120px] flex flex-col items-center justify-center': isLiveMode,
                                        // Normal mode styles  
                                        'flex-shrink-0 py-4 px-4 text-sm min-w-[85px] bottom-nav-button chord-button m-2 min-h-[60px] flex flex-col items-center justify-center': !isLiveMode,
                                        // Highlight effect
                                        'transform': isHighlighted,
                                        // Live mode hover effects
                                        'shadow-xl': isLiveMode,
                                    }
                                )}
                            >
                                {isDeleteMode && (
                                    <XCircleIcon className={`absolute top-1 right-1 h-4 w-4 text-white bg-red-500 rounded-full shadow-sm ${isLiveMode ? 'h-6 w-6' : ''}`} />
                                )}
                                
                                <div className={`text-cyan-200 font-bold ${isLiveMode ? 'text-xl mb-2' : 'text-xs mb-1'}`}>
                                    {index + 1}
                                </div>
                                <div className={`leading-tight ${isLiveMode ? 'text-base text-center text-white ' : 'text-xs'}`}>
                                    {chord.name}
                                </div>
                                
                                {isLiveMode && (
                                    <>
                                        <div className="text-xs text-gray-300 mt-4 text-center">
                                            {chord.notes.replace(/,/g, ' • ')}
                                        </div>
                                        <div className="text-xs text-gray-300 mt-1 text-center font-mono">
                                            {chord.pattern.join('-')}
                                        </div>
                                    </>
                                )}
                            </ChordButton>
                        );
                    })}
                </div>
            </div>

            {/* Live Mode Footer */}
            {isLiveMode && (
                <div className="flex-shrink-0 bg-[#1e2329] border-t border-gray-600 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                            {addedChords.length} chord{addedChords.length !== 1 ? 's' : ''} loaded
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Button
                                onClick={onClearAll}
                                variant="secondary"
                                size="sm"
                                className="py-1.5 px-3 text-xs h-7"
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={onToggleDeleteMode}
                                variant={isDeleteMode ? "danger" : "secondary"}
                                size="sm"
                                active={isDeleteMode}
                                className="py-1.5 px-3 text-xs h-7"
                            >
                                <TrashIcon className="h-3 w-3" />
                                {isDeleteMode ? 'Done' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChordNavigation;