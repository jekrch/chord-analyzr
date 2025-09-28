import { useState, useEffect, useRef, useCallback } from 'react';
import { getMidiNotes } from '../util/ChordUtil';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

interface UseChordNavigationProps {
    musicStore: any;
    playbackStore: any;
    patternStore: any;
    uiStore: any;
    setEditingChordIndex: (index: number | null) => void;
}

export const useChordNavigation = ({
    musicStore,
    playbackStore,
    patternStore,
    uiStore,
    setEditingChordIndex
}: UseChordNavigationProps) => {
    // Local state
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCompactHeight, setIsCompactHeight] = useState(false);
    
    // Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Height detection for compact layout
    useEffect(() => {
        const checkHeight = () => {
            const vh = window.innerHeight;
            const em = parseFloat(getComputedStyle(document.documentElement).fontSize);
            setIsCompactHeight(vh < 35 * em);
        };

        checkHeight();
        window.addEventListener('resize', checkHeight, { passive: true });
        window.addEventListener('orientationchange', checkHeight, { passive: true });
        
        return () => {
            window.removeEventListener('resize', checkHeight);
            window.removeEventListener('orientationchange', checkHeight);
        };
    }, []);

    // Enhanced scroll prevention with orientation change handling
    useEffect(() => {
        const { isLiveMode } = uiStore;
        
        if (isLiveMode) {
            // Store the current overflow style to restore later
            const originalOverflow = document.body.style.overflow;
            const originalOverscrollBehavior = document.body.style.overscrollBehavior;
            const originalTouchAction = document.body.style.touchAction;
            
            // Prevent body scroll with enhanced mobile support
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';
            document.body.style.touchAction = 'none';
            
            // Handle orientation changes that can break scroll
            const handleOrientationChange = () => {
                setTimeout(() => {
                    if (scrollContainerRef.current && isLiveMode && !isEditMode) {
                        const container = scrollContainerRef.current;
                        // Only apply scroll fixes when not in edit mode
                        container.style.overflowY = 'hidden';
                        container.style.touchAction = 'pan-y';
                        // Force reflow
                        container.offsetHeight;
                        container.style.overflowY = 'auto';
                        (container.style as any).WebkitOverflowScrolling = 'touch';
                    }
                }, 300);
            };
            
            window.addEventListener('orientationchange', handleOrientationChange);
            
            // Cleanup function to restore original styles
            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.overscrollBehavior = originalOverscrollBehavior;
                document.body.style.touchAction = originalTouchAction;
                window.removeEventListener('orientationchange', handleOrientationChange);
            };
        }
    }, [uiStore.isLiveMode, isEditMode]);

    // Handle edit mode changes - update scroll container immediately
    useEffect(() => {
        const isMobile = () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   'ontouchstart' in window ||
                   navigator.maxTouchPoints > 0;
        };

        if (scrollContainerRef.current && uiStore.isLiveMode) {
            const container = scrollContainerRef.current;
            if (isEditMode) {
                // In edit mode, remove scroll restrictions and let drag system handle everything
                if (isMobile()) {
                    // On mobile, be more restrictive during edit mode
                    container.style.touchAction = 'pan-y';
                    container.style.overflowY = 'auto';
                    (container.style as any).WebkitOverflowScrolling = 'auto';
                } else {
                    // Desktop: more permissive
                    container.style.removeProperty('touchAction');
                    container.style.overflowY = 'auto';
                    (container.style as any).WebkitOverflowScrolling = 'touch';
                }
            } else {
                // In non-edit mode, apply scroll optimizations
                container.style.overflowY = 'auto';
                container.style.touchAction = 'pan-y';
                (container.style as any).WebkitOverflowScrolling = 'touch';
            }
        }
    }, [isEditMode, uiStore.isLiveMode]);

    // Chord click handler
    const handleChordClick = useCallback((chordNoteNames: string, chordIndex?: number, chordName?: string) => {
        if (uiStore.isDeleteMode && chordIndex !== undefined) {
            playbackStore.removeChord(chordIndex);
            return;
        }
        const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, chordNoteNames);
        if (chordIndex !== undefined) {
            playbackStore.setTemporaryChord(null);
            playbackStore.setActiveChordIndex(chordIndex);
            if (!patternStore.globalPatternState.isPlaying) {
                playbackStore.playNotes(notesWithOctaves as any);
            }
            playbackStore.setHighlightedChordIndex(chordIndex);
            setTimeout(() => playbackStore.setHighlightedChordIndex(null), 150);
        } else {
            if (chordName) {
                playbackStore.setTemporaryChord({ name: chordName, notes: chordNoteNames });
            }
            if (!patternStore.globalPatternState.isPlaying) {
                playbackStore.playNotes(notesWithOctaves as any);
            }
        }
    }, [uiStore.isDeleteMode, patternStore.globalPatternState.isPlaying, playbackStore]);

    // General UI handlers
    const handleClearAll = useCallback(() => {
        playbackStore.clearAllChords();
        patternStore.setGlobalPatternState({ isPlaying: false });
        uiStore.setIsLiveMode(false);
    }, [playbackStore, patternStore, uiStore]);

    const handleTogglePlayback = useCallback(() => {
        patternStore.setGlobalPatternState({ isPlaying: !patternStore.globalPatternState.isPlaying });
    }, [patternStore]);

    const handleToggleDeleteMode = useCallback(() => {
        uiStore.setIsDeleteMode(!uiStore.isDeleteMode);
    }, [uiStore]);

    const handleToggleLiveMode = useCallback(() => {
        uiStore.setIsLiveMode(!uiStore.isLiveMode);
    }, [uiStore]);

    // Chord Editor handlers
    const handleUpdateChord = useCallback((index: number, updatedChord: any) => {
        const normalizedChord = {
            name: updatedChord.name, 
            notes: updatedChord.notes,
            pattern: updatedChord.pattern || ['1', '2', '3', '4'],
            originalKey: updatedChord.originalKey || musicStore.key,
            originalMode: updatedChord.originalMode || musicStore.mode,
            originalNotes: updatedChord.originalNotes || updatedChord.notes
        };
        playbackStore.updateChord(index, normalizedChord);
    }, [musicStore, playbackStore]);

    const handleEditChord = useCallback((index: number) => {
        setEditingChordIndex(index);
    }, [setEditingChordIndex]);

    const handleCloseEditor = useCallback(() => {
        setEditingChordIndex(null);
    }, [setEditingChordIndex]);

    const handleNavigateToChord = useCallback((index: number) => {
        if (index >= 0 && index < playbackStore.addedChords.length) {
            setEditingChordIndex(index);
        }
    }, [playbackStore.addedChords.length, setEditingChordIndex]);

    return {
        isEditMode,
        setIsEditMode,
        isCompactHeight,
        scrollContainerRef,
        handleChordClick,
        handleUpdateChord,
        handleEditChord,
        handleCloseEditor,
        handleNavigateToChord,
        handleClearAll,
        handleTogglePlayback,
        handleToggleDeleteMode,
        handleToggleLiveMode
    };
};