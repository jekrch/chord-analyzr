import React, { forwardRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    DndContext, 
    closestCenter
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableChordItem } from './SortableChordItem';
import { EditModeToggle } from './EditModeToggle';
import { CHORD_NAVIGATION_CONFIG } from '../../constants/chordNavigationConfig';
import { ChordButton } from './ChordButton';

// Helper function to detect mobile devices
const isMobile = () => {
    return CHORD_NAVIGATION_CONFIG.MOBILE_USER_AGENTS.test(navigator.userAgent) ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
};

interface ChordDisplayProps {
    isLiveMode: boolean;
    isEditMode: boolean;
    isDeleteMode: boolean;
    isCompactHeight: boolean;
    addedChords: any[];
    activeChordIndex: number | null;
    highlightedChordIndex: number | null;
    sensors: any;
    onChordClick: (chordNoteNames: string, chordIndex?: number, chordName?: string) => void;
    onEditChord: (index: number) => void;
    onSetEditMode: (isEdit: boolean) => void;
    onDragStart: () => void;
    onDragEnd: (result: DropResult) => void;
    onDragEndDndKit: (event: any) => void;
    onDragCancel: () => void;
}

export const ChordDisplay = forwardRef<HTMLDivElement, ChordDisplayProps>(({
    isLiveMode,
    isEditMode,
    isDeleteMode,
    isCompactHeight,
    addedChords,
    activeChordIndex,
    highlightedChordIndex,
    sensors,
    onChordClick,
    onEditChord,
    onSetEditMode,
    onDragStart,
    onDragEnd,
    onDragEndDndKit,
    onDragCancel
}, ref) => {
    // Enhanced renderChordButton function for better mobile experience
    const renderChordButton = (chord: any, index: number, isDragging: boolean = false, onEdit?: (index: number) => void) => {
        const isActive = index === activeChordIndex;
        const isHighlighted = index === highlightedChordIndex;

        const handleButtonClick = (e: React.MouseEvent) => {
            //console.log('Button clicked!', { isEditMode, hasOnEdit: !!onEdit, index });
            
            // Prevent event bubbling to avoid conflicts with drag handlers
            e.stopPropagation();
            e.preventDefault();
            
            if (isEditMode && onEdit) {
                console.log('Opening editor for chord', index);
                // In edit mode, clicking should open the editor
                onEdit(index);
            } else if (!isEditMode) {
                console.log('Playing chord', index);
                // In normal mode, clicking should play the chord
                onChordClick(chord.notes, index);
            }
        };

        // Enhanced mobile touch handling
        const handleTouchStart = (e: React.TouchEvent) => {
            if (!isEditMode) {
                // Add visual feedback for non-edit mode touches
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }
        };

        const handleTouchEnd = (e: React.TouchEvent) => {
            if (!isEditMode) {
                // Remove visual feedback
                (e.currentTarget as HTMLElement).style.transform = '';
            }
        };

        const sizeConfig = isLiveMode 
            ? (isMobile() ? CHORD_NAVIGATION_CONFIG.BUTTON_SIZES.LIVE_MOBILE : CHORD_NAVIGATION_CONFIG.BUTTON_SIZES.LIVE_DESKTOP)
            : CHORD_NAVIGATION_CONFIG.BUTTON_SIZES.COLLAPSED;

        return (
            <ChordButton
                key={index}
                onClick={handleButtonClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                variant={isDeleteMode ? "danger" : isEditMode ? "secondary" : "primary"}
                active={isActive && !isDeleteMode && !isEditMode}
                aria-label={`Pattern: ${chord.pattern.join('-')}`}
                className={`relative w-full h-full mobile-drag-item ${sizeConfig.container}`}
                style={{
                    // Let the drag system handle touch actions naturally in edit mode
                    touchAction: isEditMode ? undefined : 'auto',
                }}
                chord={chord}
                index={index}
                isLiveMode={isLiveMode}
                isDeleteMode={isDeleteMode}
                isEditMode={isEditMode}
                isHighlighted={isHighlighted}
                isDragging={isDragging}
                sizeConfig={sizeConfig}
            />
        );
    };

    const editModeToggle = (
        <EditModeToggle
            isLiveMode={isLiveMode}
            isEditMode={isEditMode}
            onClick={() => onSetEditMode(!isEditMode)}
        />
    );

    const nonEditModeView = (
        isLiveMode ? (
            // LIVE MODE - CSS Grid (non-edit)
            <div className={CHORD_NAVIGATION_CONFIG.GRID_CLASSES.LIVE_MODE}>
                {addedChords.map((chord, index) => (
                    <div key={index}>
                        {renderChordButton(chord, index)}
                    </div>
                ))}
                <div>
                    {editModeToggle}
                </div>
            </div>
        ) : (
            // COLLAPSED MODE - Horizontal flex (non-edit)
            <div className={CHORD_NAVIGATION_CONFIG.GRID_CLASSES.COLLAPSED_MODE}>
                {addedChords.map((chord, index) => (
                    <div key={index} className="flex-shrink-0">
                        {renderChordButton(chord, index)}
                    </div>
                ))}
                <div className="flex-shrink-0 py-4 px-2 min-w-[85px] min-h-[60px] mt-1 flex items-center justify-center">
                    {editModeToggle}
                </div>
            </div>
        )
    );

    const editModeView = isLiveMode ? (
        // EDIT MODE - LIVE (CSS Grid with @dnd-kit - consistent with non-edit mode)
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEndDndKit}
            onDragCancel={onDragCancel}
            modifiers={[restrictToParentElement]}
        >
            <SortableContext 
                items={addedChords.map((_, index) => `chord-${index}`)}
                strategy={rectSortingStrategy}
            >
                {/* Use the SAME grid layout as non-edit mode with forced gap */}
                <div 
                    className={CHORD_NAVIGATION_CONFIG.GRID_CLASSES.LIVE_MODE}
                    style={{ gap: '1rem' }} // Force consistent 1rem gap (gap-4)
                >
                    {addedChords.map((chord, index) => (
                        <SortableChordItem
                            key={`${chord.name}-${chord.notes}-${index}`}
                            id={`chord-${index}`}
                            index={index}
                            chord={chord}
                            onEdit={onEditChord}
                            renderChordButton={renderChordButton}
                        />
                    ))}
                    {/* Edit toggle in its own grid cell */}
                    <div>
                        {editModeToggle}
                    </div>
                </div>
            </SortableContext>
        </DndContext>
    ) : (
        // EDIT MODE - NON-LIVE (Horizontal List with @hello-pangea/dnd)
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="chord-list" direction="horizontal">
                {(provided) => (
                    <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps} 
                        className="flex pb-2 -mx-2 overflow-x-auto space-x-2 px-2 chord-sequence-scroll"
                    >
                        {addedChords.map((chord, index) => (
                            <Draggable key={`chord-${index}`} draggableId={`chord-${index}`} index={index}>
                                {(provided, snapshot) => (
                                    <div 
                                        ref={provided.innerRef} 
                                        {...provided.draggableProps} 
                                        {...provided.dragHandleProps} 
                                        className='flex-shrink-0'
                                    >
                                        {renderChordButton(chord, index, snapshot.isDragging, onEditChord)}
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        <div className="flex-shrink-0 py-4 px-2 min-w-[85px] min-h-[60px] mt-1 flex items-center justify-center">
                            {editModeToggle}
                        </div>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );

    const containerStyle = isLiveMode && !isEditMode ? {
        WebkitOverflowScrolling: 'touch' as any,
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
        position: 'relative' as const,
        zIndex: 1
    } : isLiveMode && isEditMode ? {
        // In edit mode on mobile, be more restrictive to prevent conflicts
        WebkitOverflowScrolling: isMobile() ? 'auto' : 'touch' as any,
        touchAction: isMobile() ? 'pan-y' : 'auto',
        overscrollBehavior: 'contain',
        position: 'relative' as const,
        zIndex: 1
    } : undefined;

    return (
        <div 
            ref={ref}
            className={`flex-1 max-w-7xl mx-auto w-full ${isLiveMode ? `px-4 pb-8 ${isCompactHeight ? 'pt-1' : 'pt-2'} overflow-y-auto` : 'px-2 pb-1'}`}
            style={containerStyle}
        >
            {!isEditMode ? nonEditModeView : editModeView}
        </div>
    );
});