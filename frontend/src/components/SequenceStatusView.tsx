import React, { useMemo } from 'react';
import { usePatternStore } from '../stores/patternStore';
import { usePlaybackStore } from '../stores/playbackStore';
import classNames from 'classnames';
import { AddedChord } from '../stores/types';

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

const SequenceStatusView: React.FC<SequenceStatusViewProps> = ({ className = "" }) => {
   
    const isPlaying = usePatternStore(state => state.globalPatternState.isPlaying);
    const bpm = usePatternStore(state => state.globalPatternState.bpm);
    //const currentStep = usePatternStore(state => state.globalPatternState.currentStep);
    const currentlyActivePattern = usePatternStore(state => state.currentlyActivePattern);

    const temporaryChord = usePlaybackStore(state => state.temporaryChord);
    const activeChordIndex = usePlaybackStore(state => state.activeChordIndex);
    const addedChords = usePlaybackStore(state => state.addedChords);

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

    // Memoize the active chord to avoid unnecessary recalculations
    const activeChord = useMemo(() => 
        activeChordIndex !== null ? addedChords[activeChordIndex] : null,
        [activeChordIndex, addedChords]
    );

    // Memoize the pattern string to avoid re-joining on every render
    const patternString = useMemo(() => 
        currentPattern.join('-'), 
        [currentPattern]
    );

    const patternLength = currentPattern.length > 0 ? currentPattern.length : 1;
    //const displayStep = (currentStep % patternLength) + 1;

    // If the sequencer isn't playing, the component renders nothing
    if (!isPlaying) {
        return null;
    }
    //console.log('Rendering status')

    return (
        <div className={classNames("w-full px-2 mx-auto items-center", className)}>
            <div
                className="mcb-inset px-4 py-2 w-full max-w-7xl mx-auto"
                style={{ borderColor: 'color-mix(in srgb, var(--mcb-success-primary) 40%, transparent)' }}
            >
                <div className="text-xs text-[var(--mcb-success-text)] flex items-center justify-center space-x-4">
                    <div className="flex items-center">
                        <div className="mcb-led mcb-led--success animate-pulse mr-2"></div>
                        <span className="mcb-label !text-[var(--mcb-success-text)]">Sequencer Active</span>
                    </div>
                    <div className="text-xs opacity-80 font-mono">
                        {patternString} |
                        {` ${bpm}`} BPM |
                        {/* Step {displayStep}/{patternLength} */}

                        {temporaryChord && (
                            <span className="ml-2 text-[var(--mcb-warning-text)]">{temporaryChord.name}</span>
                        )}

                        {!temporaryChord && activeChord && (
                             <span className="ml-2 text-[var(--mcb-purple-text)]">{activeChord.name}</span>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SequenceStatusView);