import React, { useState, useCallback } from 'react';
import { TrashIcon, XCircleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PlayIcon, PauseIcon, PlayCircleIcon, CogIcon } from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import {
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';
import { Button, ChordButton } from './Button';
import ChordEditor from './ChordEditor';
import { useMusicStore } from '../stores/musicStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import { useUIStore } from '../stores/uiStore';
import { getMidiNotes } from '../util/ChordUtil';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

// Sortable item component for @dnd-kit (live mode only)
interface SortableChordItemProps {
    id: string;
    index: number;
    chord: any;
    onEdit: (index: number) => void;
    renderChordButton: (chord: any, index: number, isDragging?: boolean) => React.ReactNode;
    getLiveItemWidth: () => string;
}

const SortableChordItem: React.FC<SortableChordItemProps> = ({
    id,
    index,
    chord,
    onEdit,
    renderChordButton,
    getLiveItemWidth
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleClick = (e: React.MouseEvent) => {
        // Only trigger edit if we're not dragging
        if (!isDragging) {
            onEdit(index);
        }
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`${getLiveItemWidth()} px-2 mb-4 `}
            onClick={handleClick}
        >
            {renderChordButton(chord, index, isDragging)}
        </div>
    );
};

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
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null);

    // Sensors for @dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
        patternStore.setGlobalPatternState({ isPlaying: !globalPatternState.isPlaying });
    }, [globalPatternState.isPlaying, patternStore]);

    const handleToggleDeleteMode = () => uiStore.setIsDeleteMode(!isDeleteMode);
    const handleToggleLiveMode = () => uiStore.setIsLiveMode(!isLiveMode);

    // Chord Editor handlers
    const handleUpdateChord = (index: number, updatedChord: any) => {
        const normalizedChord = {
            name: updatedChord.name, notes: updatedChord.notes,
            pattern: updatedChord.pattern || ['1', '2', '3', '4'],
            originalKey: updatedChord.originalKey || musicStore.key,
            originalMode: updatedChord.originalMode || musicStore.mode,
            originalNotes: updatedChord.originalNotes || updatedChord.notes
        };
        playbackStore.updateChord(index, normalizedChord);
    };

    const handleEditChord = (index: number) => setEditingChordIndex(index);
    const handleCloseEditor = () => setEditingChordIndex(null);
    const handleNavigateToChord = (index: number) => {
        if (index >= 0 && index < addedChords.length) {
            setEditingChordIndex(index);
        }
    };

    // @dnd-kit drag end handler for live mode
    const handleDragEndDndKit = (event: DragEndEvent) => {
        const { active, over } = event;
        
        console.log('Drag end event:', { active: active.id, over: over?.id });
        
        if (over && active.id !== over.id) {
            // Extract indices from the IDs
            const activeIndex = parseInt(active.id.toString().replace('chord-', ''));
            const overIndex = parseInt(over.id.toString().replace('chord-', ''));
            
            console.log('Moving from index', activeIndex, 'to index', overIndex);
            
            if (!isNaN(activeIndex) && !isNaN(overIndex) && 
                activeIndex >= 0 && activeIndex < addedChords.length && 
                overIndex >= 0 && overIndex < addedChords.length) {
                
                const reorderedChords = arrayMove(addedChords, activeIndex, overIndex);
                console.log('Reordered chords:', reorderedChords.map(c => c.name));
                playbackStore.setAddedChords(reorderedChords);

                // Update active chord index
                if (activeChordIndex !== null) {
                    if (activeChordIndex === activeIndex) {
                        playbackStore.setActiveChordIndex(overIndex);
                    } else if (activeIndex < activeChordIndex && overIndex >= activeChordIndex) {
                        playbackStore.setActiveChordIndex(activeChordIndex - 1);
                    } else if (activeIndex > activeChordIndex && overIndex <= activeChordIndex) {
                        playbackStore.setActiveChordIndex(activeChordIndex + 1);
                    }
                }
            }
        }
    };

    // @hello-pangea/dnd drag end handler for non-live mode
    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        if (sourceIndex === destinationIndex) return;

        const reorderedChords = Array.from(addedChords);
        const [removed] = reorderedChords.splice(sourceIndex, 1);
        reorderedChords.splice(destinationIndex, 0, removed);
        playbackStore.setAddedChords(reorderedChords);

        // Update active chord index
        if (activeChordIndex === null) return;
        if (activeChordIndex === sourceIndex) {
            playbackStore.setActiveChordIndex(destinationIndex);
        } else if (sourceIndex < activeChordIndex && destinationIndex >= activeChordIndex) {
            playbackStore.setActiveChordIndex(activeChordIndex - 1);
        } else if (sourceIndex > activeChordIndex && destinationIndex <= activeChordIndex) {
            playbackStore.setActiveChordIndex(activeChordIndex + 1);
        }
    };

    // --- RENDER LOGIC ---

    if (addedChords.length === 0) return null;

    const baseClasses = isLiveMode
        ? "fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col"
        : "fixed bottom-0 left-0 right-0 bg-[#2a2f38] border-t border-gray-600 shadow-2xl z-50";

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

    const renderChordButton = (chord: any, index: number, isDragging: boolean = false) => {
        const isActive = index === activeChordIndex;
        const isHighlighted = index === highlightedChordIndex;

        return (
            <ChordButton
                key={index}
                onClick={() => !isEditMode && handleChordClick(chord.notes, index)}
                variant={isDeleteMode ? "danger" : isEditMode ? "secondary" : "primary"}
                active={isActive && !isDeleteMode && !isEditMode}
                aria-label={`Pattern: ${chord.pattern.join('-')}`}
                className={classNames(
                    'relative w-full h-full',
                    {
                        'py-8 px-6 text-lg min-h-[120px] flex flex-col items-center justify-center': isLiveMode,
                        'py-4 px-2 text-sm min-w-[85px] bottom-nav-button chord-button space-x-1 mt-1 min-h-[60px] !min-w-[70px] flex flex-col items-center justify-center': !isLiveMode,
                        'transform': isHighlighted,
                        'shadow-xl': isLiveMode,
                        'border-blue-500 hover:border-blue-400': isEditMode,
                        'cursor-grab active:cursor-grabbing': isEditMode,
                        'opacity-80 shadow-2xl scale-105': isDragging,
                    }
                )}
            >
                {isDeleteMode && <XCircleIcon className={`absolute top-1 right-1 text-white bg-red-500 rounded-full shadow-sm ${isLiveMode ? 'h-6 w-6' : 'h-4 w-4'}`} />}
                {isEditMode && <CogIcon className={`absolute top-1 right-1 text-white bg-blue-500 rounded-full shadow-sm p-0.5 ${isLiveMode ? 'h-6 w-6' : 'h-4 w-4'}`} />}

                {/* Do not remove this transparent icon. It is necessary to make the entire button grabbable  */}
                {isEditMode && <CogIcon className={`absolute top-1 right-1 opacity-0 h-full w-full shadow-sm`} />}
                
                <div className={`text-cyan-200 font-bold ${isLiveMode ? 'text-xl mb-2' : 'text-xs mb-1'}`}>{index + 1}</div>
                <div className={`leading-tight ${isLiveMode ? 'text-base text-center text-white ' : 'text-xs'}`}>{chord.name}</div>
                {isLiveMode && (
                    <>
                        <div className="mt-4 text-xs text-center text-slate-300">{chord.notes.replace(/,/g, ' • ')}</div>
                        <div className="mt-1 font-mono text-xs text-center text-slate-300">{chord.pattern.join('-')}</div>
                    </>
                )}
            </ChordButton>
        );
    };

    const editModeToggle = (
        <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={classNames(
                "flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 hover:scale-105",
                isLiveMode ? "w-full h-full min-h-[120px] py-8 px-6" : "w-12 h-12",
                isEditMode ? "border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" : "border-gray-500 text-gray-400 hover:border-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
            )}
            title={isEditMode ? "Exit edit mode" : "Edit chords"}
        >
            <CogIcon className={`${isLiveMode ? 'w-8 h-8' : 'w-6 h-6'} ${isEditMode ? 'animate-spin' : ''}`} />
        </button>
    );

    // Calculate responsive widths for live mode
    const getLiveItemWidth = () => {
        // Responsive breakpoints matching the grid cols
        return "w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6";
    };

    const nonEditModeView = (
        isLiveMode ? (
            // LIVE MODE - CSS Grid (non-edit)
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max pt-1">
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
            <div className="flex space-x-2 overflow-x-auto pb-1 chord-sequence-scroll -mx-2 px-2">
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
        // EDIT MODE - LIVE (Flex wrap with @dnd-kit)
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndDndKit}
        >
            <SortableContext 
                items={addedChords.map((_, index) => `chord-${index}`)}
                strategy={rectSortingStrategy}
            >
                <div className="flex flex-wrap -mx-2 ">
                    {addedChords.map((chord, index) => (
                        <SortableChordItem
                            key={`${chord.name}-${chord.notes}-${index}`}
                            id={`chord-${index}`}
                            index={index}
                            chord={chord}
                            onEdit={handleEditChord}
                            renderChordButton={renderChordButton}
                            getLiveItemWidth={getLiveItemWidth}
                        />
                    ))}
                    {/* Edit toggle is NOT draggable */}
                    <div className={`${getLiveItemWidth()} px-2 mb-4`}>
                        {editModeToggle}
                    </div>
                </div>
            </SortableContext>
        </DndContext>
    ) : (
        // EDIT MODE - NON-LIVE (Horizontal List with @hello-pangea/dnd)
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="chord-list" direction="horizontal">
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex pb-1 -mx-2 overflow-x-auto space-x-2 px-2 chord-sequence-scroll">
                        {addedChords.map((chord, index) => (
                            <Draggable key={`chord-${index}`} draggableId={`chord-${index}`} index={index}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className='flex-shrink-0' onClick={() => handleEditChord(index)}>
                                        {renderChordButton(chord, index, snapshot.isDragging)}
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

    return (
        <div className={baseClasses}>
            {/* Top Control Bar */}
            <div className={`${isLiveMode ? 'flex-shrink-0' : ''} max-w-7xl mx-auto px-4 ${isLiveMode ? 'pt-4 z-10' : 'pt-2'} w-full`}>
                <div className={`flex items-center justify-between ${isLiveMode ? 'mb-3' : 'mb-2'}`}>
                    <div className="flex items-center space-x-4">
                        {!isLiveMode && <Button onClick={handleTogglePlayback} variant="icon" size="icon" active={globalPatternState.isPlaying} title={globalPatternState.isPlaying ? "Stop" : "Play"}>{globalPatternState.isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}</Button>}
                        {isLiveMode && <Button onClick={handleTogglePlayback} variant="play-stop" size="sm" active={globalPatternState.isPlaying} className="shadow-lg">{globalPatternState.isPlaying ? (<><PauseIcon className="w-4 h-4" /> Stop</>) : (<><PlayCircleIcon className="w-4 h-4" /> Play</>)}</Button>}
                    </div>
                    <div className="text-center sm:w-full sm:text-left sm:mx-4">
                        <div className="hidden sm:block text-xs font-bold text-slate-300 uppercase tracking-wider">chords {isEditMode && <span className="text-blue-400">(drag to reorder)</span>}</div>
                        <div className="block sm:hidden text-xs text-slate-300 uppercase tracking-wider">chords {isEditMode && <span className="text-blue-400">(drag)</span>}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleToggleLiveMode} className={classNames("w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200", isLiveMode ? "text-slate-200 bg-[#4a5262] border-gray-600 hover:bg-[#525a6b]" : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600")}>{isLiveMode ? (<><ArrowsPointingInIcon className="h-3 w-3" /><span>Collapse</span></>) : (<><ArrowsPointingOutIcon className="h-3 w-3" /><span>Expand</span></>)}</button>
                        {!isLiveMode && (<>
                            <button onClick={() => { if (isLiveMode) handleToggleLiveMode(); handleClearAll(); }} className="w-[5em] h-8 flex items-center justify-center px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200">Clear</button>
                            <button onClick={handleToggleDeleteMode} className={classNames("w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200", isDeleteMode ? "text-white bg-red-600 border-red-500 hover:bg-red-700" : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600")}><TrashIcon className="h-3 w-3" /><span>{isDeleteMode ? 'Done' : 'Delete'}</span></button>
                        </>)}
                    </div>
                </div>
                {isLiveMode && <div className="mb-4 text-sm text-center text-slate-400"><div>Use 1-{Math.min(addedChords.length, 9)} or click chords</div><div className="mt-2 text-xs"><span className="inline-block w-3 h-3 mr-2 bg-blue-500 rounded-full"></span> Active Chord{isEditMode && (<><span className="mx-2">•</span><span className="text-blue-400">Drag chords to reorder</span></>)}</div></div>}
            </div>

            {/* Chord Display Area */}
            <div className={`flex-1 max-w-7xl mx-auto w-full ${isLiveMode ? 'px-4 pb-8 overflow-y-auto' : 'px-2 pb-2'}`}>
                {!isEditMode ? nonEditModeView : editModeView}
            </div>

            {/* Live Mode Footer  */}
            {isLiveMode && (
                <div className="flex-shrink-0 bg-[#2a2f38] border-t border-gray-600 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-400">{addedChords.length} chord{addedChords.length !== 1 ? 's' : ''} loaded{isEditMode && <span className="ml-2 text-blue-400">• Edit Mode: Click chords to edit</span>}</div>
                        <div className="flex items-center space-x-2">
                            <button onClick={handleClearAll} className="w-[5em] h-8 flex items-center justify-center px-3 py-1.5 text-xs text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border border-gray-600 rounded transition-all duration-200">Clear</button>
                            <button onClick={handleToggleDeleteMode} className={classNames("w-[7em] h-8 flex items-center space-x-2 px-3 py-1.5 text-xs border rounded transition-all duration-200", isDeleteMode ? "text-white bg-red-600 border-red-500 hover:bg-red-700" : "text-slate-300 hover:text-slate-200 bg-[#4a5262] hover:bg-[#525a6b] border-gray-600")}><TrashIcon className="h-3 w-3" /><span>{isDeleteMode ? 'Done' : 'Delete'}</span></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChordNavigation;