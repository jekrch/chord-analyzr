import React from 'react';
import { XCircleIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/20/solid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Piano as ReactPiano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import classNames from 'classnames';
import { Button } from './Button';
import { useChordEditor, AddedChord } from '../hooks/useChordEditor';
import { getMidiNotes } from '../util/ChordUtil'; // Import the proper octave calculation function
import { ModeScaleChordDto } from '../api';

// Constants matching your PianoControl
const START_OCTAVE = 4;
const END_OCTAVE = 8;

// Static Piano Visualization Component
const StaticPianoVisualization: React.FC<{ activeMidiNotes: number[] }> = ({ activeMidiNotes }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState<number>(400);

    // Responsive width calculation
    const pianoWidth = React.useMemo(() => {
        if (containerWidth < 400) {
            return Math.max(300, containerWidth - 20);
        } else if (containerWidth < 768) {
            return Math.min(500, containerWidth - 40);
        } else {
            return Math.min(600, containerWidth - 60);
        }
    }, [containerWidth]);

    // Measure container width
    React.useEffect(() => {
        const measureWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        measureWidth();

        const resizeObserver = new ResizeObserver(() => {
            measureWidth();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Enhanced custom styles to ensure active notes stay highlighted in all states
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            /* Disable all pointer events on piano keys to prevent hover/click interference */
            .ReactPiano__Key {
                pointer-events: none !important;
            }
            
            /* Ultra-specific CSS to override react-piano styles */
            div[class*="ReactPiano"] .ReactPiano__Key--active,
            div[class*="ReactPiano"] .ReactPiano__Key--active.ReactPiano__Key--natural,
            div[class*="ReactPiano"] .ReactPiano__Key--active.ReactPiano__Key--accidental,
            .ReactPiano__Key--active[class*="ReactPiano__Key"],
            .ReactPiano__Key--active[class*="ReactPiano__Key"]:hover,
            .ReactPiano__Key--active[class*="ReactPiano__Key"]:active,
            .ReactPiano__Key--active[class*="ReactPiano__Key"]:focus {
                background: #3b82f6 !important;
                background-color: #3b82f6 !important;
                background-image: none !important;
                color: white !important;
                border-color: #2563eb !important;
                border-top-color: #2563eb !important;
                border-left-color: #2563eb !important;
                border-right-color: #2563eb !important;
                border-bottom-color: #2563eb !important;
                box-shadow: none !important;
                transition: none !important;
            }
            
            /* Force natural (white) keys to stay blue */
            div[class*="ReactPiano"] .ReactPiano__Key--active.ReactPiano__Key--natural,
            .ReactPiano__Key--active.ReactPiano__Key--natural[class*="ReactPiano__Key"],
            .ReactPiano__Key--active.ReactPiano__Key--natural[class*="ReactPiano__Key"]:hover,
            .ReactPiano__Key--active.ReactPiano__Key--natural[class*="ReactPiano__Key"]:active,
            .ReactPiano__Key--active.ReactPiano__Key--natural[class*="ReactPiano__Key"]:focus {
                background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important;
                background-color: #3b82f6 !important;
                color: white !important;
                border-top: 1px solid #2563eb !important;
                border-left: 1px solid #2563eb !important;
                border-right: 1px solid #2563eb !important;
                border-bottom: 1px solid #1e40af !important;
                box-shadow: 
                    inset 0 0 0 1px rgba(37, 99, 235, 0.3),
                    inset 0 -3px 6px rgba(0,0,0,0.1) !important;
            }
            
            /* Force accidental (black) keys to stay blue */
            div[class*="ReactPiano"] .ReactPiano__Key--active.ReactPiano__Key--accidental,
            .ReactPiano__Key--active.ReactPiano__Key--accidental[class*="ReactPiano__Key"],
            .ReactPiano__Key--active.ReactPiano__Key--accidental[class*="ReactPiano__Key"]:hover,
            .ReactPiano__Key--active.ReactPiano__Key--accidental[class*="ReactPiano__Key"]:active,
            .ReactPiano__Key--active.ReactPiano__Key--accidental[class*="ReactPiano__Key"]:focus {
                background: linear-gradient(to bottom, #1d4ed8 0%, #1e40af 100%) !important;
                background-color: #1d4ed8 !important;
                color: white !important;
                border: 1px solid #1e40af !important;
                box-shadow: 
                    inset 0 0 0 1px rgba(30, 64, 175, 0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.2) !important;
            }
            
            /* Override any CSS animations or transitions */
            .ReactPiano__Key--active * {
                transition: none !important;
                animation: none !important;
            }
            
            /* Nuclear option - override any inline styles that might be applied */
            .ReactPiano__Key--active[style] {
                background: #3b82f6 !important;
                background-color: #3b82f6 !important;
            }
            
            .ReactPiano__Key--active.ReactPiano__Key--natural[style] {
                background: linear-gradient(to bottom, #3b82f6 0%, #2563eb 100%) !important;
            }
            
            .ReactPiano__Key--active.ReactPiano__Key--accidental[style] {
                background: linear-gradient(to bottom, #1d4ed8 0%, #1e40af 100%) !important;
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const startOctave = 4;
    const endOctave = 7;
    const firstNote = MidiNumbers.fromNote(`c${startOctave}`);
    const lastNote = MidiNumbers.fromNote(`c${endOctave}`);

    return (
        <div ref={containerRef} className="w-full">
            <ReactPiano
                noteRange={{ first: firstNote, last: lastNote }}
                playNote={() => {}} // No-op for static display
                stopNote={() => {}} // No-op for static display
                disabled={false}
                width={pianoWidth}
                activeNotes={activeMidiNotes}
                className="mx-auto"
            />
        </div>
    );
};

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

    // Convert chord notes to MIDI numbers using the same logic as PianoControl
    const getActiveMidiNotes = React.useMemo(() => {
        if (!editingChord?.notes) return [];
        
        try {
            // Use the same getMidiNotes function as PianoControl for consistent octave assignment
            const notesWithOctaves = getMidiNotes(START_OCTAVE, END_OCTAVE, editingChord.notes);
            return notesWithOctaves.map(({ note, octave }) => {
                try {
                    return MidiNumbers.fromNote(`${note}${octave}`);
                } catch (error) {
                    console.warn(`Failed to parse note: ${note}${octave}`, error);
                    return null;
                }
            }).filter(Boolean) as number[];
        } catch (error) {
            console.warn('Failed to parse chord notes:', error);
            return [];
        }
    }, [editingChord?.notes]);

    if (!editingChord) return null;

    const notes = parseNotes(editingChord.notes);
    const hasPrevious = editingChordIndex > 0;
    const hasNext = editingChordIndex < totalChords - 1;

    return (
        <div className="fixed inset-0 bg-[#1a1e24] bg-opacity-95 backdrop-blur-sm z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 max-w-4xl mx-auto px-4 py-4 w-full">
                {/* Top Row - Title and Save/Cancel buttons */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                            Edit: {editingChord.name.replace(/\/[A-G][#b]?\d*/, '')}
                        </h2>
                        <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded font-mono flex-shrink-0">
                            {editingChordIndex + 1} / {totalChords}
                        </span>
                    </div>
                    
                    {/* Save/Cancel buttons - always in top right */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
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
                            <span className="hidden sm:inline">Cancel</span>
                            <span className="sm:hidden">✕</span>
                        </Button>
                    </div>
                </div>

                {/* Bottom Row - Navigation controls only */}
                <div className="flex items-center">
                    {/* Navigation Controls */}
                    {onNavigateToChord && (
                        <div className="flex items-center space-x-1">
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
                </div>

                {/* Slash Note Input - More Compact */}
                <div className="p-3 bg-[#2a2f38] rounded-lg border border-gray-600 mb-4 mt-4">
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
                            placeholder="e.g., C4, F#, Bb3"
                            className={classNames(
                                "flex-1 px-3 py-2 bg-[#1a1e24] border rounded text-white placeholder-gray-400 focus:outline-none transition-colors text-sm",
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
                        <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                            <XCircleIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{slashNoteError}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 mt-1">
                            Add bass note (e.g., Cmaj7/E)
                        </p>
                    )}
                    {notes.length > 0 && isManualSlashNote(notes[0]) && !slashNoteError && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                            <div className="flex items-center space-x-2">
                                <LockClosedIcon className="w-3 h-3" />
                                <span>Slash note locked in first position</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Piano Visualization */}
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 p-3 mb-4">
                    <div className="bg-[#1a1e24] rounded p-2 flex justify-center overflow-x-auto">
                        <StaticPianoVisualization activeMidiNotes={getActiveMidiNotes} />
                    </div>
                </div>
            </div>

            {/* Notes Editor - Scrollable and fills remaining space */}
            <div className="flex-1 max-w-4xl mx-auto px-4 w-full overflow-hidden flex flex-col -mt-4">
                <div className="bg-[#2a2f38] rounded-lg border border-gray-600 p-4 flex-1 flex flex-col min-h-0">
                    {/* Compact header with play button and centered text */}
                    <div className="flex items-center justify-between mb-3">
                        <Button
                            onClick={handlePreviewChord}
                            variant="secondary"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            title="Preview chord"
                        >
                            <PlayIcon className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Preview</span>
                        </Button>
                        <div className="flex-1 text-center mx-4">
                            <h3 className="text-lg font-medium text-white leading-tight">Chord Notes</h3>
                            <p className="text-xs text-gray-400 leading-tight">Drag to reorder</p>
                        </div>
                        <div className="w-16 sm:w-20"></div> {/* Spacer to balance the layout and match button width */}
                    </div>
                    
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