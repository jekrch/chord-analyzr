import React from 'react';
import { TrashIcon, XCircleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, StopIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';

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
            <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 py-3 w-full`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4">
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                            Chord Sequence
                        </div>
                        {isLiveMode && (
                            <button
                                onClick={onTogglePlayback}
                                className={classNames(
                                    'flex items-center gap-1 text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200',
                                    {
                                        'bg-green-600 hover:bg-green-700 text-white shadow-lg': globalPatternState.isPlaying,
                                        'bg-gray-600 hover:bg-gray-700 text-white': !globalPatternState.isPlaying
                                    }
                                )}
                            >
                                {globalPatternState.isPlaying ? (
                                    <>
                                        <StopIcon className="h-4 w-4" />
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <PlayIcon className="h-4 w-4" />
                                        Play
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onToggleLiveMode}
                            className={classNames(
                                'flex items-center gap-1 text-xs font-medium py-1 px-3 rounded transition-colors',
                                {
                                    'bg-blue-600 hover:bg-blue-700 text-white': isLiveMode,
                                    'bg-gray-600 hover:bg-gray-700 text-white': !isLiveMode
                                }
                            )}
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
                        </button>
                        {!isLiveMode && (
                            <>
                                <button
                                    className="text-xs bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded transition-colors"
                                    onClick={() => {
                                        if (isLiveMode)
                                            onToggleLiveMode();
                                        onClearAll(); 
                                    }}
                                >
                                    Clear All
                                </button>
                                <button
                                    onClick={onToggleDeleteMode}
                                    className={classNames('flex items-center gap-1 text-xs font-medium py-1 px-3 rounded transition-colors', {
                                        'bg-red-600 hover:bg-red-700 text-white': isDeleteMode,
                                        'bg-gray-600 hover:bg-gray-700 text-white': !isDeleteMode
                                    })}
                                >
                                    <TrashIcon className="h-3 w-3" />
                                    {isDeleteMode ? 'Done' : 'Delete'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Live Mode Info */}
                {isLiveMode && (
                    <div className="text-center text-gray-400 text-sm mb-4">
                        <div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div>
                        <div className="text-xs mt-1">
                            <span className="inline-block w-3 h-3 bg-cyan-500 rounded-full mr-1"></span>
                            Active Chord
                        </div>
                    </div>
                )}
            </div>

            {/* Chord Buttons */}
            <div className={`flex-1 max-w-7xl mx-auto px-4 w-full ${isLiveMode ? 'pb-8 overflow-y-auto pt-2' : 'pb-2'}`}>
                <div className={
                    isLiveMode 
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max"
                        : "flex space-x-2 overflow-x-auto pb-2 chord-sequence-scroll"
                }>
                    {addedChords.map((chord, index) => {
                        const isActive = index === activeChordIndex;
                        const isHighlighted = index === highlightedChordIndex;

                        return (
                            <button
                                key={index}
                                className={classNames(
                                    'relative font-medium transition-all duration-200 rounded-lg',
                                    {
                                        // Live mode styles
                                        'py-8 px-6 text-lg min-h-[120px] flex flex-col items-center justify-center': isLiveMode,
                                        // Normal mode styles  
                                        'flex-shrink-0 py-3 px-4 text-sm min-w-[85px] bottom-nav-button chord-button m-2': !isLiveMode,
                                        // Active state
                                        'bg-cyan-500 shadow-lg text-white ring-2 ring-cyan-300': isActive && !isDeleteMode,
                                        // Inactive state
                                        'bg-cyan-700 hover:bg-cyan-600 text-white': !isActive && !isDeleteMode,
                                        // Delete mode
                                        'bg-red-700 hover:bg-red-600 text-white shadow-md': isDeleteMode,
                                        // Highlight effect
                                        'transform': isHighlighted,
                                        // Live mode hover effects
                                        'shadow-xl': isLiveMode,
                                    }
                                )}
                                onClick={() => onChordClick(chord.notes, index)}
                                title={`Pattern: ${chord.pattern.join('-')}`}
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
                            </button>
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
                        <div className="flex items-center space-x-2">
                            <button
                                className="text-xs bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded transition-colors"
                                onClick={onClearAll}
                            >
                                Clear All
                            </button>
                            <button
                                onClick={onToggleDeleteMode}
                                className={classNames('flex items-center gap-1 text-xs font-medium py-1 px-3 rounded transition-colors', {
                                    'bg-red-600 hover:bg-red-700 text-white': isDeleteMode,
                                    'bg-gray-600 hover:bg-gray-700 text-white': !isDeleteMode
                                })}
                            >
                                <TrashIcon className="h-3 w-3" />
                                {isDeleteMode ? 'Done' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChordNavigation;