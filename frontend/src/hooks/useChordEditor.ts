import { useState } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { ModeScaleChordDto } from '../api';

export interface AddedChord {
    name: string;
    notes: string;
    pattern: string[];
    originalNotes?: string;
    originalKey?: string;
    originalMode?: string;
}

interface UseChordEditorProps {
    chords?: ModeScaleChordDto[];
    onUpdateChord?: (index: number, updatedChord: AddedChord) => void;
    onFetchOriginalChord?: (chordName: string, key: string, mode: string) => Promise<string | null>;
    onChordClick: (notes: string, index: number) => void;
}

// Helper functions
const parseNotes = (notesString: string): string[] => {
    return notesString.split(',').map(note => note.trim());
};

const notesToString = (notes: string[]): string => {
    return notes.join(', ');
};

const isValidNoteName = (note: string): boolean => {
    if (!note.trim()) return true; // Empty is valid (no slash note)
    
    // Valid note pattern: A-G (case insensitive) + optional sharp/flat + optional octave number
    const notePattern = /^[a-gA-G][#b]?(\d+)?$/;
    return notePattern.test(note.trim());
};

const formatNoteName = (note: string): string => {
    if (!note.trim()) return note;
    
    const trimmed = note.trim();
    if (!isValidNoteName(trimmed)) {
        return trimmed; // Return as-is if invalid, let validation handle it
    }
    
    const match = trimmed.match(/^([a-gA-G])([#b]?)(\d*)$/);
    if (match) {
        const [, noteLetter, accidental, octave] = match;
        const formattedNote = noteLetter.toUpperCase() + accidental.toLowerCase();
        return formattedNote + octave;
    }
    
    return trimmed;
};

export const useChordEditor = ({
    chords,
    onUpdateChord,
    onFetchOriginalChord,
    onChordClick
}: UseChordEditorProps) => {
    const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null);
    const [editingChord, setEditingChord] = useState<AddedChord | null>(null);
    const [slashNote, setSlashNote] = useState<string>('');
    const [originalChordNotes, setOriginalChordNotes] = useState<string>('');
    const [slashNoteError, setSlashNoteError] = useState<string>('');

    const findOriginalChordFromLibrary = async (chord: AddedChord): Promise<string | null> => {
        const baseChordName = chord.name.replace(/\/[A-G][#b]?\d*/, '');
        
        if (chords) {
            const currentChord = chords.find(c => c.chordName === baseChordName);
            // Fixed: Use chordNoteNames instead of chordNotes to match the interface
            if (currentChord?.chordNoteNames) {
                return currentChord.chordNoteNames;
            }
        }
        
        if (chord.originalKey && chord.originalMode && onFetchOriginalChord) {
            try {
                console.log('!!!Fetching original chord for', baseChordName, 'in', chord.originalKey, chord.originalMode);
                const originalNotes = await onFetchOriginalChord(baseChordName, chord.originalKey, chord.originalMode);
                console.log(originalNotes)
                if (originalNotes) {
                    return originalNotes;
                }
            } catch (error) {
                console.warn('Failed to fetch original chord:', error);
            }
        }
        
        return chord.originalNotes || null;
    };

    // Check if a slash note is manually added (not from original chord)
    const isManualSlashNote = (note: string): boolean => {
        if (!slashNote.trim() || !originalChordNotes) return false;
        
        const noteNameOnly = note.replace(/\d+/, '');
        const slashNoteNameOnly = slashNote.trim().replace(/\d+/, '');
        
        // If this note matches the slash note
        if (noteNameOnly === slashNoteNameOnly) {
            // Check if it exists in the original chord
            const originalNotes = parseNotes(originalChordNotes);
            const existsInOriginal = originalNotes.some(originalNote => {
                const originalNoteNameOnly = originalNote.replace(/\d+/, '');
                return originalNoteNameOnly === slashNoteNameOnly;
            });
            return !existsInOriginal;
        }
        
        return false;
    };

    const handleEditChord = async (index: number, chord: AddedChord) => {
        setEditingChordIndex(index);
        setEditingChord({ ...chord });
        
        try {
            const originalNotes = await findOriginalChordFromLibrary(chord);
            setOriginalChordNotes(originalNotes || chord.notes);
        } catch (error) {
            console.warn('Failed to load original chord, using current notes:', error);
            setOriginalChordNotes(chord.originalNotes || chord.notes);
        }
        
        const slashMatch = chord.name.match(/\/([A-G][#b]?\d*)/);
        if (slashMatch) {
            setSlashNote(slashMatch[1]);
        } else {
            setSlashNote('');
        }
    };

    const handleSaveEdit = () => {
        if (editingChordIndex !== null && editingChord && onUpdateChord) {
            // Don't save if there's a slash note error
            if (slashNoteError) {
                return;
            }

            let updatedName = editingChord.name.replace(/\/[A-G][#b]?\d*/, '');
            let updatedNotes = editingChord.notes;

            if (slashNote.trim()) {
                updatedName += `/${slashNote.trim()}`;
                
                const currentNotes = parseNotes(updatedNotes);
                const slashNoteFormatted = slashNote.trim();
                
                const slashNoteExists = currentNotes.some(note => {
                    const noteNameOnly = note.replace(/\d+/, '');
                    const slashNoteNameOnly = slashNoteFormatted.replace(/\d+/, '');
                    return noteNameOnly === slashNoteNameOnly;
                });
                
                if (!slashNoteExists) {
                    const notesWithSlash = [slashNoteFormatted, ...currentNotes];
                    updatedNotes = notesToString(notesWithSlash);
                } else {
                    const filteredNotes = currentNotes.filter(note => {
                        const noteNameOnly = note.replace(/\d+/, '');
                        const slashNoteNameOnly = slashNoteFormatted.replace(/\d+/, '');
                        return noteNameOnly !== slashNoteNameOnly;
                    });
                    const notesWithSlash = [slashNoteFormatted, ...filteredNotes];
                    updatedNotes = notesToString(notesWithSlash);
                }
            }

            const updatedChord = {
                ...editingChord,
                name: updatedName,
                notes: updatedNotes,
                originalNotes: editingChord.originalNotes || originalChordNotes
            };

            onUpdateChord(editingChordIndex, updatedChord);
        }
        handleCancelEdit();
    };

    const handleCancelEdit = () => {
        setEditingChordIndex(null);
        setEditingChord(null);
        setSlashNote('');
        setOriginalChordNotes('');
        setSlashNoteError('');
    };

    const moveNoteUp = async (noteIndex: number) => {
        if (!editingChord || noteIndex === 0) return;
        
        const notes = parseNotes(editingChord.notes);
        
        // Prevent moving manually added slash note from first position
        if (noteIndex === 1 && isManualSlashNote(notes[0])) {
            return;
        }
        
        [notes[noteIndex], notes[noteIndex - 1]] = [notes[noteIndex - 1], notes[noteIndex]];
        
        setEditingChord({
            ...editingChord,
            notes: notesToString(notes)
        });

        await detectSlashNoteFromOrder(notes);
    };

    const moveNoteDown = async (noteIndex: number) => {
        if (!editingChord) return;
        
        const notes = parseNotes(editingChord.notes);
        if (noteIndex === notes.length - 1) return;
        
        // Prevent moving manually added slash note from first position
        if (noteIndex === 0 && isManualSlashNote(notes[0])) {
            return;
        }
        
        [notes[noteIndex], notes[noteIndex + 1]] = [notes[noteIndex + 1], notes[noteIndex]];
        
        setEditingChord({
            ...editingChord,
            notes: notesToString(notes)
        });

        await detectSlashNoteFromOrder(notes);
    };

    const removeSlashNote = async () => {
        setSlashNote('');
        if (editingChord) {
            try {
                //console.log('Reverting to original chord notes');
                console.log('Current editing chord:', editingChord);
                const libraryOriginalNotes = await findOriginalChordFromLibrary(editingChord);
                const originalNotes = libraryOriginalNotes || editingChord.originalNotes || originalChordNotes;
                console.log('Reverting to original notes:', originalNotes);
                // Ensure we're setting properly formatted note names, not MIDI numbers
                if (originalNotes) {
                    // Validate that originalNotes contains note names and not MIDI numbers
                    const parsedOriginal = parseNotes(originalNotes);
                    const hasValidNoteNames = parsedOriginal.every(note => {
                        // Check if it looks like a note name (starts with A-G)
                        return /^[A-Ga-g]/.test(note.trim());
                    });
                    
                    if (hasValidNoteNames) {
                        setEditingChord({
                            ...editingChord,
                            notes: originalNotes
                        });
                    } else {
                        console.warn('Original notes appear to be in invalid format, keeping current notes:', originalNotes);
                        // Keep the current notes if the original seems invalid
                    }
                } else {
                    console.warn('No original notes found, keeping current notes');
                }
            } catch (error) {
                console.warn('Failed to revert to original chord:', error);
                const originalNotes = editingChord.originalNotes || originalChordNotes;
                if (originalNotes) {
                    // Same validation for fallback
                    const parsedOriginal = parseNotes(originalNotes);
                    const hasValidNoteNames = parsedOriginal.every(note => {
                        return /^[A-Ga-g]/.test(note.trim());
                    });
                    
                    if (hasValidNoteNames) {
                        setEditingChord({
                            ...editingChord,
                            notes: originalNotes
                        });
                    }
                }
            }
        }
    };

    const updateChordNotesWithSlashNote = async (newSlashNote: string) => {
        if (!editingChord) return;

        try {
            const libraryOriginalNotes = await findOriginalChordFromLibrary(editingChord);
            const originalNotes = libraryOriginalNotes || editingChord.originalNotes || originalChordNotes;
            
            if (!originalNotes) return;

            if (!newSlashNote.trim()) {
                setEditingChord({
                    ...editingChord,
                    notes: originalNotes
                });
                return;
            }

            const originalNotesArray = parseNotes(originalNotes);
            const slashNoteFormatted = newSlashNote.trim();
            
            const existsInOriginal = originalNotesArray.some(note => {
                const noteNameOnly = note.replace(/\d+/, '');
                const slashNoteNameOnly = slashNoteFormatted.replace(/\d+/, '');
                return noteNameOnly === slashNoteNameOnly;
            });

            let updatedNotes: string[];

            if (existsInOriginal) {
                const otherNotes = originalNotesArray.filter(note => {
                    const noteNameOnly = note.replace(/\d+/, '');
                    const slashNoteNameOnly = slashNoteFormatted.replace(/\d+/, '');
                    return noteNameOnly !== slashNoteNameOnly;
                });
                
                const matchingNote = originalNotesArray.find(note => {
                    const noteNameOnly = note.replace(/\d+/, '');
                    const slashNoteNameOnly = slashNoteFormatted.replace(/\d+/, '');
                    return noteNameOnly === slashNoteNameOnly;
                });

                updatedNotes = matchingNote ? [matchingNote, ...otherNotes] : [slashNoteFormatted, ...otherNotes];
            } else {
                updatedNotes = [slashNoteFormatted, ...originalNotesArray];
            }

            setEditingChord({
                ...editingChord,
                notes: notesToString(updatedNotes)
            });
        } catch (error) {
            console.warn('Failed to update chord with slash note:', error);
            const originalNotes = editingChord.originalNotes || originalChordNotes;
            if (!originalNotes) return;

            if (!newSlashNote.trim()) {
                setEditingChord({
                    ...editingChord,
                    notes: originalNotes
                });
                return;
            }

            const originalNotesArray = parseNotes(originalNotes);
            const slashNoteFormatted = newSlashNote.trim();
            const updatedNotes = [slashNoteFormatted, ...originalNotesArray];

            setEditingChord({
                ...editingChord,
                notes: notesToString(updatedNotes)
            });
        }
    };

    const detectSlashNoteFromOrder = async (notes: string[]) => {
        if (!editingChord || notes.length === 0) return;

        try {
            const libraryOriginalNotes = await findOriginalChordFromLibrary(editingChord);
            const originalNotes = libraryOriginalNotes || editingChord.originalNotes || originalChordNotes;
            
            if (!originalNotes) return;

            const originalNotesArray = parseNotes(originalNotes);
            const firstNote = notes[0];
            const originalFirstNote = originalNotesArray[0];

            if (firstNote !== originalFirstNote) {
                setSlashNote(firstNote);
            } else {
                setSlashNote('');
            }
        } catch (error) {
            console.warn('Failed to detect slash note from order:', error);
            const originalNotes = editingChord.originalNotes || originalChordNotes;
            if (!originalNotes) return;

            const originalNotesArray = parseNotes(originalNotes);
            const firstNote = notes[0];
            const originalFirstNote = originalNotesArray[0];

            if (firstNote !== originalFirstNote) {
                setSlashNote(firstNote);
            } else {
                setSlashNote('');
            }
        }
    };

    const handleSlashNoteChange = async (value: string) => {
        const trimmedValue = value.trim();
        
        // Clear error if input is empty
        if (!trimmedValue) {
            setSlashNoteError('');
            setSlashNote('');
            await updateChordNotesWithSlashNote('');
            return;
        }
        
        // Validate the note name
        if (!isValidNoteName(trimmedValue)) {
            setSlashNoteError('Invalid note. Use A-G with optional # or b (e.g., C, F#, Bb, D4)');
            setSlashNote(value); // Keep the invalid input visible
            return;
        }
        
        // Clear error and format the valid note
        setSlashNoteError('');
        const formattedValue = formatNoteName(trimmedValue);
        setSlashNote(formattedValue);
        await updateChordNotesWithSlashNote(formattedValue);
    };

    const isSlashNote = (note: string): boolean => {
        if (!slashNote.trim()) return false;
        
        const noteNameOnly = note.replace(/\d+/, '');
        const slashNoteNameOnly = slashNote.trim().replace(/\d+/, '');
        return noteNameOnly === slashNoteNameOnly;
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination || !editingChord || result.source.index === result.destination.index) {
            return;
        }

        const notes = parseNotes(editingChord.notes);
        
        // Prevent dragging manually added slash note from first position
        if (result.source.index === 0 && isManualSlashNote(notes[0])) {
            return;
        }
        
        // Prevent dropping anything into first position if there's a manually added slash note there
        if (result.destination.index === 0 && isManualSlashNote(notes[0])) {
            return;
        }

        const [reorderedItem] = notes.splice(result.source.index, 1);
        notes.splice(result.destination.index, 0, reorderedItem);

        setEditingChord({
            ...editingChord,
            notes: notesToString(notes)
        });

        await detectSlashNoteFromOrder(notes);
    };

    const handlePreviewChord = () => {
        if (editingChord) {
            onChordClick(editingChord.notes, -1);
        }
    };

    return {
        // State
        editingChordIndex,
        editingChord,
        slashNote,
        originalChordNotes,
        slashNoteError,
        
        // Actions
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
        
        // Utilities
        parseNotes,
        notesToString,
        formatNoteName,
        isValidNoteName
    };
};