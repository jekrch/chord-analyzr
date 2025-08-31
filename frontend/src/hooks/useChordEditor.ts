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

const formatNoteName = (note: string): string => {
    if (!note.trim()) return note;
    
    const match = note.trim().match(/^([a-gA-G][#b]?)(\d*)$/);
    if (match) {
        const [, noteName, octave] = match;
        const formattedNote = noteName.charAt(0).toUpperCase() + noteName.slice(1).toLowerCase();
        return formattedNote + octave;
    }
    
    return note;
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

    const findOriginalChordFromLibrary = async (chord: AddedChord): Promise<string | null> => {
        const baseChordName = chord.name.replace(/\/[A-G][#b]?\d*/, '');
        
        if (chords) {
            const currentChord = chords.find(c => c.chordName === baseChordName);
            if (currentChord?.chordNotes) {
                return currentChord.chordNotes;
            }
        }
        
        if (chord.originalKey && chord.originalMode && onFetchOriginalChord) {
            try {
                const originalNotes = await onFetchOriginalChord(baseChordName, chord.originalKey, chord.originalMode);
                if (originalNotes) {
                    return originalNotes;
                }
            } catch (error) {
                console.warn('Failed to fetch original chord:', error);
            }
        }
        
        return chord.originalNotes || null;
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
    };

    const moveNoteUp = async (noteIndex: number) => {
        if (!editingChord || noteIndex === 0) return;
        
        const notes = parseNotes(editingChord.notes);
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
                const libraryOriginalNotes = await findOriginalChordFromLibrary(editingChord);
                const originalNotes = libraryOriginalNotes || editingChord.originalNotes || originalChordNotes;
                
                setEditingChord({
                    ...editingChord,
                    notes: originalNotes
                });
            } catch (error) {
                console.warn('Failed to revert to original chord:', error);
                const originalNotes = editingChord.originalNotes || originalChordNotes;
                setEditingChord({
                    ...editingChord,
                    notes: originalNotes
                });
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
        const formattedValue = formatNoteName(value);
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
        
        // Utilities
        parseNotes,
        notesToString,
        formatNoteName
    };
};