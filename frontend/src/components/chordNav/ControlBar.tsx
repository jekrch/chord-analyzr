import React from 'react';
import { TrashIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, PauseIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
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
                    <div className="hidden sm:block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        chords {isEditMode && <span className="text-blue-400">(drag to reorder)</span>}
                    </div>
                    <div className="block sm:hidden text-xs text-slate-300 uppercase tracking-wider">
                        chords {isEditMode && <span className="text-blue-400">(drag)</span>}
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onToggleLiveMode} 
                        className={classNames(
                            "w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200", 
                            isLiveMode ? 
                                "text-slate-200 bg-[#4a5262] border-gray-600 hover:bg-[#525a6b]" : 
                                "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600"
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
                                    if (isLiveMode) onToggleLiveMode(); 
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
                                    isDeleteMode ? 
                                        "text-white bg-red-600 border-red-500 hover:bg-red-700" : 
                                        "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600"
                                )}
                            >
                                <TrashIcon className="h-3 w-3" />
                                <span>{isDeleteMode ? 'Done' : 'Delete'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {isLiveMode && !isCompactHeight && (
                <div className="mb-4 text-sm text-center text-slate-400">
                    <div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div>
                    <div className="mt-2 text-xs">
                        <span className="inline-block w-3 h-3 mr-2 bg-blue-500 rounded-full"></span> 
                        Active Chord
                        {isEditMode && (
                            <>
                                <span className="mx-2">•</span>
                                <span className="text-blue-400">Drag chords to reorder</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};