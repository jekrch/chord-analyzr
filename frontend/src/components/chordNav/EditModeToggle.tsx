import React from 'react';
import { CogIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { CHORD_NAVIGATION_CONFIG } from '../../constants/chordNavigationConfig';

// Helper function to detect mobile devices
const isMobile = () => {
    return CHORD_NAVIGATION_CONFIG.MOBILE_USER_AGENTS.test(navigator.userAgent) ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
};

interface EditModeToggleProps {
    isLiveMode: boolean;
    isEditMode: boolean;
    onClick: () => void;
}

export const EditModeToggle: React.FC<EditModeToggleProps> = ({
    isLiveMode,
    isEditMode,
    onClick
}) => {
    return (
        <button
            onClick={onClick}
            className={classNames(
                "flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200",
                isLiveMode ? "w-full h-full min-h-[120px] py-8 px-6" : "w-12 h-12",
                isEditMode ? 
                    "border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" : 
                    "border-gray-500 text-gray-400 hover:border-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
            )}
            title={isEditMode ? "Exit edit mode" : "Edit chords"}
            style={{
                minHeight: isLiveMode && isMobile() ? '140px' : undefined,
            }}
        >
            <CogIcon 
                className={classNames(
                    isLiveMode ? 'w-8 h-8' : 'w-6 h-6',
                    { 'animate-spin': isEditMode }
                )} 
            />
        </button>
    );
};