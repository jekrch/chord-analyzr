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
        : "fixed bottom-0 left-0 right-0 bg-[#2a2f38] border-t border-gray-600 shadow-2xl z-50";

    return (
        <div className={baseClasses}>
            {/* Header */}
            <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? 'py-4' : 'py-3'} w-full`}>
                <div className={`flex items-center justify-between ${isLiveMode ? 'mb-3' : 'mb-2'}`}>
                    <div className="flex items-center space-x-4">
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
                                className="shadow-lg"
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
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mr-4">
                            Chords
                        </h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onToggleLiveMode}
                            className={classNames(
                                "w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200",
                                isLiveMode
                                    ? "text-slate-200 bg-[#4a5262] border-gray-600 hover:bg-[#525a6b]"
                                    : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600"
                            )}
                        >
                            {isLiveMode ? (
                                <>
                                    <ArrowsPointingInIcon className="h-3 w-3" />
                                    <span>Collapse</span>
                                </>
                            ) : (
                                <>
                                    <ArrowsPointingOutIcon className="h-3 w-3" />
                                    <span>Expand</span>
                                </>
                            )}
                        </button>
                        {!isLiveMode && (
                            <>
                                <button
                                    onClick={() => {
                                        if (isLiveMode)
                                            onToggleLiveMode();
                                        onClearAll();
                                    }}
                                    className="w-[5em] h-8 flex items-center justify-center px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={onToggleDeleteMode}
                                    className={classNames(
                                        "w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200",
                                        isDeleteMode
                                            ? "text-white bg-red-600 border-red-500 hover:bg-red-700"
                                            : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600"
                                    )}
                                >
                                    <TrashIcon className="h-3 w-3" />
                                    <span>{isDeleteMode ? 'Done' : 'Delete'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Live Mode Info */}
                {isLiveMode && (
                    <div className="text-center text-slate-400 text-sm mb-4">
                        <div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div>
                        <div className="text-xs mt-2">
                            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                            Active Chord
                        </div>
                    </div>
                )}
            </div>

            {/* Chord Buttons */}
            <div className={`flex-1 max-w-7xl mx-auto w-full ${isLiveMode ? 'px-4 pb-8 overflow-y-auto' : 'px-1 sm:px-4 pb-3'}`}>
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
                                        'flex-shrink-0 py-4 px-2 text-sm min-w-[85px] bottom-nav-button chord-button space-x-1 mt-1 min-h-[60px] flex flex-col items-center justify-center': !isLiveMode,
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
                                        <div className="text-xs text-slate-300 mt-4 text-center">
                                            {chord.notes.replace(/,/g, ' • ')}
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 text-center font-mono">
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
                <div className="flex-shrink-0 bg-[#2a2f38] border-t border-gray-600 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-xs text-slate-400 font-medium">
                            {addedChords.length} chord{addedChords.length !== 1 ? 's' : ''} loaded
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={onClearAll}
                                className="w-[5em] h-8 flex items-center justify-center px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200"
                            >
                                Clear
                            </button>
                            <button
                                onClick={onToggleDeleteMode}
                                className={classNames(
                                    "w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200",
                                    isDeleteMode
                                        ? "text-white bg-red-600 border-red-500 hover:bg-red-700"
                                        : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600"
                                )}
                            >
                                <TrashIcon className="h-3 w-3" />
                                <span>{isDeleteMode ? 'Done' : 'Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChordNavigation;