import React from 'react';
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
        <div className="flex-shrink-0 bg-mcb-app border-t border-mcb-subtle px-4 py-3">
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
                </div>
            </div>
        </div>
    );
};