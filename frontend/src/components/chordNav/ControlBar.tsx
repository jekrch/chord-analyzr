import React from 'react';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { TransportButton } from '../TransportButton';

interface ControlBarProps {
    isLiveMode: boolean;
    isEditMode: boolean;
    isDeleteMode: boolean;
    isCompactHeight: boolean;
    isCompactChords: boolean;
    globalPatternState: { isPlaying: boolean };
    addedChords: any[];
    onTogglePlayback: () => void;
    onToggleLiveMode: () => void;
    onToggleCompactChords: () => void;
    onClearAll: () => void;
    onToggleDeleteMode: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    isLiveMode,
    isEditMode,
    isDeleteMode,
    isCompactHeight,
    isCompactChords,
    globalPatternState,
    addedChords,
    onTogglePlayback,
    onToggleLiveMode,
    onToggleCompactChords,
    onClearAll,
    onToggleDeleteMode
}) => {
    return (
        <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? 'pt-2 z-10' : 'pt-2'} w-full`}>
            <div className={`flex items-center justify-between ${isLiveMode ? (isCompactHeight ? 'mb-1' : 'mb-2') : 'mb-2'}`}>
                <div className="flex items-center shrink-0">
                    <TransportButton isPlaying={globalPatternState.isPlaying} onClick={onTogglePlayback} />
                </div>
                
                <div className="min-w-0 flex-1 mx-3 text-center sm:text-left sm:mx-4">
                    <div className="hidden sm:block mcb-label truncate">
                        chords {isEditMode && <span className="text-[var(--mcb-accent-text-primary)]">(drag to reorder)</span>}
                    </div>
                    <div className="block sm:hidden mcb-label truncate">
                        chords {isEditMode && <span className="text-[var(--mcb-accent-text-primary)]">(drag)</span>}
                    </div>
                </div>

                <div className="flex items-center shrink-0 space-x-1.5 sm:space-x-2">
                    {isLiveMode && (
                        <button
                            onClick={onToggleCompactChords}
                            className={classNames(
                                "mcb-switch mcb-switch--pill min-w-20 sm:w-[9.5em] h-7",
                                { "mcb-switch--on": isCompactChords }
                            )}
                            title={isCompactChords ? "Show chord details" : "Smaller chord pads, more on screen"}
                        >
                            <span className={classNames("mcb-led", { "mcb-led--off": !isCompactChords })} />
                            <span>Compact</span>
                        </button>
                    )}
                    <button
                        onClick={onToggleLiveMode}
                        title={isLiveMode ? 'Collapse' : 'Expand'}
                        aria-label={isLiveMode ? 'Collapse' : 'Expand'}
                        className="w-7 sm:w-[9em] h-7 shrink-0 flex items-center justify-center gap-1.5 sm:px-2 rounded-md border border-mcb-subtle text-[0.6875rem] uppercase tracking-wider text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover transition-all duration-200"
                    >
                        {isLiveMode ? (
                            <>
                                <ArrowsPointingInIcon className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Collapse</span>
                            </>
                        ) : (
                            <>
                                <ArrowsPointingOutIcon className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Expand</span>
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
                                className="sm:w-[5em] h-7 flex items-center justify-center px-2.5 sm:px-3 rounded-md border border-mcb-subtle text-[0.6875rem] uppercase tracking-wider text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover transition-all duration-200"
                            >
                                Clear
                            </button>
                            <button
                                onClick={onToggleDeleteMode}
                                className={classNames(
                                    "mcb-switch mcb-switch--pill min-w-19 sm:w-[8.5em] h-7",
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
                <div className="mb-2 text-xs text-center text-mcb-tertiary">
                    Use 1-{Math.min(addedChords.length, 9)} or click chords
                    <span className="mx-2">•</span>
                    <span className="inline-block w-2.5 h-2.5 mr-1.5 bg-[var(--mcb-accent-primary)] rounded-[1px] align-middle"></span>
                    Active Chord
                    {isEditMode && (
                        <>
                            <span className="mx-2">•</span>
                            <span className="text-[var(--mcb-accent-text-primary)]">Drag chords to reorder</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};