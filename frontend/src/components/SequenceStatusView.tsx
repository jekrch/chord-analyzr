import React, { useMemo } from 'react';
import { usePatternStore } from '../stores/patternStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { AddedChord } from '../util/urlStateEncoder';
import classNames from 'classnames';

type SequenceStatusViewProps = {
    className?: string;
};

/**
 * Helper function to determine the current pattern based on playback state.
 * This logic is moved here from the main app logic hook.
 */
const resolveCurrentPattern = (
    temporaryChord: { name: string; notes: string } | null,
    activeChordIndex: number | null,
    addedChords: AddedChord[],
    globalPattern: string[]
): string[] => {
    if (temporaryChord) {
        return globalPattern;
    }
    if (activeChordIndex !== null && addedChords[activeChordIndex]?.pattern) {
        return addedChords[activeChordIndex].pattern;
    }
    return globalPattern;
};


const SequenceStatusView: React.FC<SequenceStatusViewProps> = ({className = ""}) => {
    // Direct state access from stores
    const { globalPatternState, currentlyActivePattern } = usePatternStore();
    const { temporaryChord, activeChordIndex, addedChords } = usePlaybackStore();

    
    const { isPlaying, bpm, currentStep } = globalPatternState;

    // Derived state using useMemo for performance
    const currentPattern = useMemo(() => 
        resolveCurrentPattern(
            temporaryChord, 
            activeChordIndex, 
            addedChords, 
            currentlyActivePattern
        ),
        [temporaryChord, activeChordIndex, addedChords, currentlyActivePattern]
    );

    // If the sequencer isn't playing, the component renders nothing
    if (!isPlaying) {
        return null;
    }

    const patternLength = currentPattern.length > 0 ? currentPattern.length : 1;
    const displayStep = (currentStep % patternLength) + 1;

    return (
        <div className={classNames("w-full px-2 mx-auto items-center", className)}>
            <div className="px-6 py-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700 w-full max-w-7xl mx-auto">
                <div className="text-sm text-green-300 flex items-center justify-center space-x-4">
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                        <span className="font-medium">Sequencer Active</span>
                    </div>
                    <div className="text-xs opacity-80 font-mono">
                        {currentPattern.join('-')} |
                        {` ${bpm}`} BPM |
                        Step {displayStep}/{patternLength}
                        
                        {temporaryChord && (
                            <span className="ml-2 text-yellow-300">• {temporaryChord.name}</span>
                        )}

                        {!temporaryChord && activeChordIndex !== null && (
                             <span className="ml-2 text-purple-300">• {addedChords[activeChordIndex]?.name}</span>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SequenceStatusView;