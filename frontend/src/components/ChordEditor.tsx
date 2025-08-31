import React from 'react';
import { XCircleIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import classNames from 'classnames';
import { Button } from './Button';
import { useChordEditor, AddedChord } from '../hooks/useChordEditor';
import { ModeScaleChordDto } from '../api';

interface ChordEditorProps {
    editingChordIndex: number;
    editingChord: AddedChord;
    totalChords: number;
    chords?: ModeScaleChordDto[];
    onUpdateChord?: (index: number, updatedChord: AddedChord) => void;
    onFetchOriginalChord?: (chordName: string, key: string, mode: string) => Promise<string | null>;
    onChordClick: (notes: string, index: number) => void;
    onClose: () => void;
    onNavigateToChord?: (index: number) => void;
}

const ChordEditor: React.FC<ChordEditorProps> = ({
    editingChordIndex,
    editingChord: initialChord,
    totalChords,
    chords,
    onUpdateChord,
    onFetchOriginalChord,
    onChordClick,
    onClose,
    onNavigateToChord
}) => {
    const {
        editingChord,
        slashNote,
        slashNoteError,
        handleEditChord,
        handleSaveEdit,
        handleCancelEdit,
        moveNoteUp,
        moveNoteDown,
        removeSlashNote,
        handleSlashNoteChange,
        handleDragEnd,
        handlePreviewChord,
        isSlashNote,
        isManualSlashNote,
        parseNotes
    } = useChordEditor({
        chords,
        onUpdateChord,
        onFetchOriginalChord,
        onChordClick
    });

    // Initialize editing when component mounts or chord changes
    React.useEffect(() => {
        handleEditChord(editingChordIndex, initialChord);
    }, [editingChordIndex, initialChord]);

    const handleSave = () => {
        handleSaveEdit();
        onClose();
    };

    const handleCancel = () => {
        handleCancelEdit();
        onClose();
    };

    const handlePreviousChord = () => {
        if (editingChordIndex > 0 && onNavigateToChord) {
            onNavigateToChord(editingChordIndex - 1);
        }
    };

    const handleNextChord = () => {
        if (editingChordIndex < totalChords - 1 && onNavigateToChord) {
            onNavigateToChord(editingChordIndex + 1);
        }
    };

    if (!editingChord) return null;

    const notes = parseNotes(editingChord.notes);
    const hasPrevious = editingChordIndex > 0;
    const hasNext = editingChordIndex < totalChords - 1;

    return (
        <div className="fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 max-w-4xl mx-auto px-4 py-6 w-full">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                                Edit: {editingChord.name.replace(/\/[A-G][#b]?\d*/, '')}
                            </h2>
                            <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded font-mono">
                                {editingChordIndex + 1} / {totalChords}
                            </span>
                        </div>
                        <Button
                            onClick={handlePreviewChord}
                            variant="secondary"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                            title="Preview chord"
                        >
                            <PlayIcon className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Preview</span>
                        </Button>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Navigation Controls */}
                        {onNavigateToChord && (
                            <div className="flex items-center space-x-1 mr-2">
                                <Button
                                    onClick={handlePreviousChord}
                                    variant="secondary"
                                    size="sm"
                                    disabled={!hasPrevious}
                                    title="Previous chord"
                                    className="px-2"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={handleNextChord}
                                    variant="secondary"
                                    size="sm"
                                    disabled={!hasNext}
                                    title="Next chord"
                                    className="px-2"
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        <Button
                            onClick={handleSave}
                            variant="primary"
                            size="sm"
                            disabled={!!slashNoteError}
                            className={classNames(
                                "bg-green-600 hover:bg-green-700",
                                slashNoteError && "opacity-50 cursor-not-allowed"
                            )}
                            title={slashNoteError ? "Fix slash note error before saving" : "Save changes"}
                        >
                            <CheckIcon className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Save</span>
                        </Button>
                        <Button
                            onClick={handleCancel}
                            variant="secondary"
                            size="sm"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Slash Note Input */}
                <div className="p-4 bg-[#2a2f38] rounded-lg border border-gray-600">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Slash Note (Bass Note)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={slashNote}
                            onChange={(e) => handleSlashNoteChange(e.target.value)}
                            onBlur={(e) => handleSlashNoteChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSlashNoteChange(e.currentTarget.value);
                                }
                            }}
                            placeholder="e.g., C4, F#, Bb3 (leave empty for no slash note)"
                            className={classNames(
                                "flex-1 px-3 py-2 bg-[#1a1e24] border rounded text-white placeholder-gray-400 focus:outline-none transition-colors",
                                slashNoteError
                                    ? "border-red-500 focus:border-red-400"
                                    : "border-gray-600 focus:border-blue-500"
                            )}
                        />
                        {slashNote.trim() && !slashNoteError && (
                            <button
                                onClick={removeSlashNote}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                title="Remove slash note"
                            >
                                <XCircleIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {slashNoteError ? (
                        <p className="text-xs text-red-400 mt-2 flex items-center space-x-1">
                            <XCircleIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{slashNoteError}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 mt-1">
                            This will be added as the bass note (e.g., Cmaj7/E). Valid notes: A-G with optional # or b
                        </p>
                    )}
                    {notes.length > 0 && isManualSlashNote(notes[0]) && !slashNoteError && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                            <div className="flex items-center space-x-2">
                                <LockClosedIcon className="w-3 h-3" />
                                <span>This slash note is locked in first position (not from original chord)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notes Editor - Scrollable and fills remaining space */}
            <div className="flex-1 max-w-4xl mx-auto px-4 w-full overflow-hidden flex flex-col">
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 p-4 flex-1 flex flex-col min-h-0">
                    <h3 className="text-lg font-medium text-white mb-4">Chord Notes</h3>
                    <p className="text-sm text-gray-400 mb-4">Drag notes to reorder them, or use the arrow buttons</p>
                    
                    <div className="flex-1 min-h-0">
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="notes-list">
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={classNames(
                                            "space-y-3 transition-colors duration-200 overflow-y-auto h-full",
                                            {
                                                'bg-blue-500/5 rounded-lg p-2': snapshot.isDraggingOver
                                            }
                                        )}
                                    >
                                        {notes.map((note, index) => {
                                            const isSlash = isSlashNote(note);
                                            const isManualSlash = isManualSlashNote(note);
                                            const isLocked = isManualSlash && index === 0;
                                            
                                            return (
                                                <Draggable 
                                                    key={`${note}-${index}`} 
                                                    draggableId={`${note}-${index}`} 
                                                    index={index}
                                                    isDragDisabled={isLocked}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={classNames(
                                                                "flex items-center space-x-3 p-3 rounded border transition-all duration-200",
                                                                {
                                                                    'shadow-lg shadow-blue-500/20 border-blue-500 transform scale-105': snapshot.isDragging,
                                                                    'cursor-grab': !snapshot.isDragging && !isLocked,
                                                                    'cursor-grabbing': snapshot.isDragging,
                                                                    'cursor-not-allowed': isLocked,
                                                                    // Slash note highlighting
                                                                    'bg-amber-500/10 border-amber-500/50': isSlash && !snapshot.isDragging,
                                                                    'hover:border-amber-400/70': isSlash && !snapshot.isDragging,
                                                                    // Locked note styling
                                                                    'bg-amber-600/15 border-amber-600/60': isLocked && !snapshot.isDragging,
                                                                    // Regular note styling
                                                                    'bg-[#1a1e24] border-gray-600': !isSlash && !isLocked && !snapshot.isDragging,
                                                                    'hover:border-gray-500': !isSlash && !isLocked && !snapshot.isDragging,
                                                                }
                                                            )}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            <div className="flex-1 text-left">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-white font-mono text-lg font-semibold">{note}</span>
                                                                    <div className="flex items-center space-x-2">
                                                                        {isSlash && (
                                                                            <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-medium">
                                                                                SLASH
                                                                            </span>
                                                                        )}
                                                                        {isLocked && (
                                                                            <span className="px-2 py-1 text-xs bg-amber-600/20 text-amber-200 rounded border border-amber-600/30 font-medium flex items-center space-x-1">
                                                                                <LockClosedIcon className="w-3 h-3" />
                                                                                <span>LOCKED</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-slate-400 font-medium">Note {index + 1}</div>
                                                            </div>
                                                            
                                                            {/* Order Controls */}
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs text-slate-400 mr-2">Order:</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveNoteUp(index);
                                                                    }}
                                                                    disabled={index === 0 || isLocked || (index === 1 && isManualSlashNote(notes[0]))}
                                                                    className="p-1 text-slate-300 hover:text-white hover:bg-[#4a5262] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title={isLocked ? "Cannot move locked slash note" : (index === 1 && isManualSlashNote(notes[0])) ? "Cannot move past locked slash note" : "Move up"}
                                                                >
                                                                    <ChevronUpIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveNoteDown(index);
                                                                    }}
                                                                    disabled={index === notes.length - 1 || isLocked}
                                                                    className="p-1 text-slate-300 hover:text-white hover:bg-[#4a5262] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title={isLocked ? "Cannot move locked slash note" : "Move down"}
                                                                >
                                                                    <ChevronDownIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            </div>

            {/* Bottom padding */}
            <div className="flex-shrink-0 h-4"></div>
        </div>
    );
};

export default ChordEditor;