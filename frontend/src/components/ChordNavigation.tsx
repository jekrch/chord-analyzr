import React, { useState } from 'react';
import { TrashIcon, XCircleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, StopIcon, PauseIcon, PlayCircleIcon, CogIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Button, ChordButton } from './Button';
import ChordEditor from './ChordEditor';
import { AddedChord } from '../hooks/useChordEditor';
import { ModeScaleChordDto } from '../api';

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
    chords?: ModeScaleChordDto[];
    onChordClick: (notes: string, index: number) => void;
    onClearAll: () => void;
    onToggleDeleteMode: () => void;
    onToggleLiveMode: () => void;
    onTogglePlayback: () => void;
    onUpdateChord?: (index: number, updatedChord: AddedChord) => void;
    onFetchOriginalChord?: (chordName: string, key: string, mode: string) => Promise<string | null>;
}

const ChordNavigation: React.FC<ChordNavigationProps> = ({
    addedChords,
    activeChordIndex,
    highlightedChordIndex,
    isDeleteMode,
    isLiveMode,
    globalPatternState,
    chords,
    onChordClick,
    onClearAll,
    onToggleDeleteMode,
    onToggleLiveMode,
    onTogglePlayback,
    onUpdateChord,
    onFetchOriginalChord
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null);

    if (addedChords.length === 0) return null;

    const handleEditChord = (index: number) => {
        setEditingChordIndex(index);
    };

    const handleCloseEditor = () => {
        setEditingChordIndex(null);
    };

    const baseClasses = isLiveMode
        ? "fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col"
        : "fixed bottom-0 left-0 right-0 bg-[#2a2f38] border-t border-gray-600 shadow-2xl z-50";

    // If we're editing a specific chord, show the chord editor
    if (editingChordIndex !== null) {
        const editingChord = addedChords[editingChordIndex];
        if (editingChord) {
            return (
                <ChordEditor
                    editingChordIndex={editingChordIndex}
                    editingChord={editingChord}
                    chords={chords}
                    onUpdateChord={onUpdateChord}
                    onFetchOriginalChord={onFetchOriginalChord}
                    onChordClick={onChordClick}
                    onClose={handleCloseEditor}
                />
            );
        }
    }

    return (
        <div className={baseClasses}>
            {/* Header */}
            <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? 'py-4' : 'pt-2'} w-full`}>
                <div className={`flex items-center justify-between ${isLiveMode ? 'mb-3' : 'mb-2'}`}>
                    {/* Left Section - stays on the left */}
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
                    </div>

                    {/* Center Section - centered between left and right */}
                    <div className="text-center sm:w-full sm:text-left sm:mx-4">
                        {/* Desktop version - visible on sm and up */}
                        <div className="hidden sm:block text-xs font-bold text-slate-300 uppercase tracking-wider">
                            chords
                        </div>
                        {/* Mobile version - visible on smaller than sm */}
                        <div className="block sm:hidden text-xs text-slate-300 uppercase tracking-wider">
                            chords
                        </div>
                    </div>

                    {/* Right Section - stays on the right */}
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
            <div className={`flex-1 max-w-7xl mx-auto w-full ${isLiveMode ? 'px-4 pb-8 overflow-y-auto' : 'px-2 pb-2'}`}>
                <div className={
                    isLiveMode
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max"
                        : "flex space-x-2 overflow-x-auto pb-1 chord-sequence-scroll -mx-2 px-2"
                }>
                    {addedChords.map((chord, index) => {
                        const isActive = index === activeChordIndex;
                        const isHighlighted = index === highlightedChordIndex;

                        return (
                            <ChordButton
                                key={index}
                                onClick={() => isEditMode ? handleEditChord(index) : onChordClick(chord.notes, index)}
                                variant={isDeleteMode ? "danger" : isEditMode ? "secondary" : "primary"}
                                active={isActive && !isDeleteMode && !isEditMode}
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
                                        // Edit mode styling
                                        'border-blue-500 hover:border-blue-400': isEditMode,
                                    }
                                )}
                            >
                                {isDeleteMode && (
                                    <XCircleIcon className={`absolute top-1 right-1 h-4 w-4 text-white bg-red-500 rounded-full shadow-sm ${isLiveMode ? 'h-6 w-6' : ''}`} />
                                )}

                                {isEditMode && (
                                    <CogIcon className={`absolute top-1 right-1 h-4 w-4 text-white bg-blue-500 rounded-full shadow-sm p-0.5 ${isLiveMode ? 'h-6 w-6' : ''}`} />
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

                    {/* Edit Mode Toggle Button - appears after last chord */}
                    <div className={classNames(
                        'flex items-center justify-center',
                        {
                            'py-8 px-6 min-h-[120px]': isLiveMode,
                            'flex-shrink-0 py-4 px-2 min-w-[85px] min-h-[60px] mt-1': !isLiveMode,
                        }
                    )}>
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={classNames(
                                "flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 hover:scale-105",
                                {
                                    'w-16 h-16': isLiveMode,
                                    'w-12 h-12': !isLiveMode,
                                },
                                isEditMode
                                    ? "border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                                    : "border-gray-500 text-gray-400 hover:border-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                            )}
                            title={isEditMode ? "Exit edit mode" : "Edit chords"}
                        >
                            <CogIcon className={`${isLiveMode ? 'w-8 h-8' : 'w-6 h-6'} ${isEditMode ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Mode Footer */}
            {isLiveMode && (
                <div className="flex-shrink-0 bg-[#2a2f38] border-t border-gray-600 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-xs text-slate-400 font-medium">
                            {addedChords.length} chord{addedChords.length !== 1 ? 's' : ''} loaded
                            {isEditMode && <span className="ml-2 text-blue-400">• Edit Mode: Click chords to edit</span>}
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