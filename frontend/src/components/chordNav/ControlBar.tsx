import React from 'react';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, PauseIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { Button } from '../Button';

interface ControlBarProps {
    isLiveMode: boolean;
    isEditMode: boolean;
    isDeleteMode: boolean;
    isCompactHeight: boolean;
    globalPatternState: { isPlaying: boolean };
    addedChords: any[];
    onTogglePlayback: () => void;
    onToggleLiveMode: () => void;
    onClearAll: () => void;
    onToggleDeleteMode: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    isLiveMode,
    isEditMode,
    isDeleteMode,
    isCompactHeight,
    globalPatternState,
    addedChords,
    onTogglePlayback,
    onToggleLiveMode,
    onClearAll,
    onToggleDeleteMode
}) => {
    return (
        <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? (isCompactHeight ? 'pt-2 z-10' : 'pt-4 z-10') : 'pt-2'} w-full`}>
            <div className={`flex items-center justify-between ${isLiveMode ? (isCompactHeight ? 'mb-1' : 'mb-3') : 'mb-2'}`}>
                <div className="flex items-center space-x-4">
                    {!isLiveMode && (
                        <Button 
                            onClick={onTogglePlayback} 
                            variant="icon" 
                            size="icon" 
                            active={globalPatternState.isPlaying} 
                            title={globalPatternState.isPlaying ? "Stop" : "Play"}
                        >
                            {globalPatternState.isPlaying ? 
                                <PauseIcon className="w-4 h-4" /> : 
                                <PlayIcon className="w-4 h-4" />
                            }
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
                                    <PauseIcon className="w-4 h-4" /> Stop
                                </>
                            ) : (
                                <>
                                    <PlayCircleIcon className="w-4 h-4" /> Play
                                </>
                            )}
                        </Button>
                    )}
                </div>
                
                <div className="text-center sm:w-full sm:text-left sm:mx-4">
                    <div className="hidden sm:block mcb-label">
                        chords {isEditMode && <span className="text-[var(--mcb-accent-text-primary)]">(drag to reorder)</span>}
                    </div>
                    <div className="block sm:hidden mcb-label">
                        chords {isEditMode && <span className="text-[var(--mcb-accent-text-primary)]">(drag)</span>}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={onToggleLiveMode}
                        className="w-[7.5em] h-7 flex items-center justify-center gap-1.5 px-3 rounded-full border border-mcb-subtle text-[0.6875rem] uppercase tracking-wider text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover transition-all duration-200"
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
                                    if (isLiveMode) onToggleLiveMode();
                                    onClearAll();
                                }}
                                className="w-[5em] h-7 flex items-center justify-center px-3 rounded-full border border-mcb-subtle text-[0.6875rem] uppercase tracking-wider text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover transition-all duration-200"
                            >
                                Clear
                            </button>
                            <button
                                onClick={onToggleDeleteMode}
                                className={classNames(
                                    "mcb-switch w-[7.5em] h-7 justify-center",
                                    { "mcb-switch--danger": isDeleteMode }
                                )}
                            >
                                <span className={classNames("mcb-led", isDeleteMode ? "mcb-led--danger" : "mcb-led--off")} />
                                <span>{isDeleteMode ? 'Done' : 'Delete'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {isLiveMode && !isCompactHeight && (
                <div className="mb-4 text-sm text-center text-mcb-tertiary">
                    <div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div>
                    <div className="mt-2 text-xs">
                        <span className="inline-block w-3 h-3 mr-2 bg-[var(--mcb-accent-primary)] rounded-full"></span> 
                        Active Chord
                        {isEditMode && (
                            <>
                                <span className="mx-2">•</span>
                                <span className="text-[var(--mcb-accent-text-primary)]">Drag chords to reorder</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};