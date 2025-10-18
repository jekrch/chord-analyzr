import React, { useState, useCallback } from 'react';
import { useMusicStore } from '../../stores/musicStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { usePatternStore } from '../../stores/patternStore';
import { useUIStore } from '../../stores/uiStore';
import ChordEditor from './ChordEditor';
import { useChordNavigation } from '../../hooks/useChordNavigation';
import { useMobileDrag } from '../../hooks/useMobileDrag';
import { ControlBar } from './ControlBar';
import { ChordDisplay } from './ChordDisplay';
import { LiveModeFooter } from './LiveModeFooter';
import { CHORD_NAVIGATION_CONFIG } from '../../constants/chordNavigationConfig';

const ChordNavigation: React.FC = () => {
    // Stores
    const musicStore = useMusicStore();
    const playbackStore = usePlaybackStore();
    const patternStore = usePatternStore();
    const uiStore = useUIStore();

    // State from stores
    const { addedChords, activeChordIndex, highlightedChordIndex } = playbackStore;
    const { isDeleteMode, isLiveMode } = uiStore;
    const { globalPatternState } = patternStore;
    const { chords } = musicStore;

    // Local state
    const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null);

    // Custom hooks
    const {
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
    } = useChordNavigation({
        musicStore,
        playbackStore,
        patternStore,
        uiStore,
        setEditingChordIndex
    });

    const {
        sensors,
        handleDragStart,
        handleDragCancel,
        handleDragEndDndKit,
        handleDragEnd
    } = useMobileDrag({
        addedChords,
        activeChordIndex,
        playbackStore,
        isLiveMode
    });

    // Early returns
    if (addedChords.length === 0) return null;

    if (editingChordIndex !== null) {
        const editingChord = addedChords[editingChordIndex];
        if (editingChord) {
            return (
                <ChordEditor
                    editingChordIndex={editingChordIndex}
                    editingChord={editingChord}
                    totalChords={addedChords.length}
                    chords={chords}
                    onUpdateChord={handleUpdateChord}
                    onFetchOriginalChord={playbackStore.handleFetchOriginalChord}
                    onChordClick={handleChordClick}
                    onClose={handleCloseEditor}
                    onNavigateToChord={handleNavigateToChord}
                />
            );
        }
    }

    const baseClasses = isLiveMode
        ? "fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col"
        : "fixed bottom-0 left-0 right-0 bg-[#2a2f38] bg-[#363c46] border-t border-gray-600 shadow-2xl z-50";

    return (
        <div 
            className={baseClasses}
            style={isLiveMode ? {
                touchAction: 'none',
                overscrollBehavior: 'none'
            } : undefined}
        >
            {/* Mobile drag prevention styles */}
            <style>{CHORD_NAVIGATION_CONFIG.DRAG_STYLES}</style>

            <ControlBar
                isLiveMode={isLiveMode}
                isEditMode={isEditMode}
                isDeleteMode={isDeleteMode}
                isCompactHeight={isCompactHeight}
                globalPatternState={globalPatternState}
                addedChords={addedChords}
                onTogglePlayback={handleTogglePlayback}
                onToggleLiveMode={handleToggleLiveMode}
                onClearAll={handleClearAll}
                onToggleDeleteMode={handleToggleDeleteMode}
            />

            <ChordDisplay
                ref={scrollContainerRef}
                isLiveMode={isLiveMode}
                isEditMode={isEditMode}
                isDeleteMode={isDeleteMode}
                isCompactHeight={isCompactHeight}
                addedChords={addedChords}
                activeChordIndex={activeChordIndex}
                highlightedChordIndex={highlightedChordIndex}
                sensors={sensors}
                onChordClick={handleChordClick}
                onEditChord={handleEditChord}
                onSetEditMode={setIsEditMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEndDndKit={handleDragEndDndKit}
                onDragCancel={handleDragCancel}
            />

            {isLiveMode && (
                <LiveModeFooter
                    isEditMode={isEditMode}
                    isDeleteMode={isDeleteMode}
                    addedChords={addedChords}
                    onClearAll={handleClearAll}
                    onToggleDeleteMode={handleToggleDeleteMode}
                />
            )}
        </div>
    );
};

export default ChordNavigation;