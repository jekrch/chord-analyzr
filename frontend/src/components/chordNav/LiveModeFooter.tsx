import React from 'react';
import { TrashIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';

interface LiveModeFooterProps {
    isEditMode: boolean;
    isDeleteMode: boolean;
    addedChords: any[];
    onClearAll: () => void;
    onToggleDeleteMode: () => void;
}

export const LiveModeFooter: React.FC<LiveModeFooterProps> = ({
    isEditMode,
    isDeleteMode,
    addedChords,
    onClearAll,
    onToggleDeleteMode
}) => {
    return (
        <div className="flex-shrink-0 bg-mcb-primary border-t border-mcb-primary px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="text-xs font-medium text-mcb-tertiary mr-3">
                    {addedChords.length} chord{addedChords.length !== 1 ? 's' : ''} loaded
                    {isEditMode && (
                        <span className="ml-2 text-[var(--mcb-accent-text-primary)]">• Edit Mode: Click chords to edit</span>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onClearAll} 
                        className="w-[5em] h-8 flex items-center justify-center px-3 py-1.5 text-xs text-mcb-secondary hover:text-mcb-primary bg-mcb-hover hover:bg-mcb-active border border-mcb-primary rounded transition-all duration-200"
                    >
                        Clear
                    </button>
                    
                    <button 
                        onClick={onToggleDeleteMode} 
                        className={classNames(
                            "w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200", 
                            isDeleteMode ? 
                                "text-white bg-[var(--mcb-danger-primary)] border-[var(--mcb-danger-border)] hover:bg-[var(--mcb-danger-secondary)]" : 
                                "text-mcb-secondary hover:text-mcb-primary bg-mcb-hover hover:bg-mcb-active border-mcb-primary"
                        )}
                    >
                        <TrashIcon className="h-3 w-3" />
                        <span>{isDeleteMode ? 'Done' : 'Delete'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};