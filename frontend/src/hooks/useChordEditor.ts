import { useState } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { ModeScaleChordDto } from '../api';
import { dataService } from '../services/DataService';

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

    // Valid note pattern: A-G (case insensitive) + optional double/single sharp/flat + optional octave number
    // Supports: C, C#, C##, Cb, Cbb, C4, C#4, C##4, Cb4, Cbb4, etc.
    const notePattern = /^[a-gA-G](##|#|bb|b)?(\d+)?$/;
    return notePattern.test(note.trim());
};

const formatNoteName = (note: string): string => {
    if (!note.trim()) return note;

    const trimmed = note.trim();
    if (!isValidNoteName(trimmed)) {
        return trimmed; // Return as-is if invalid, let validation handle it
    }

    const match = trimmed.match(/^([a-gA-G])(##|#|bb|b)?(\d*)$/);
    if (match) {
        const [, noteLetter, accidental = '', octave] = match;
        const formattedNote = noteLetter.toUpperCase() + accidental.toLowerCase();
        return formattedNote + octave;
    }

    return trimmed;
};

// Helper to convert note name to normalized MIDI number (0-11)
const noteNameToNumber = (noteName: string): number | null => {
    const noteMap: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'Fb': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11, 'B#': 0, 'Cb': 11
    };
    
    // Extract just the note name without octave number
    const match = noteName.match(/^([A-Ga-g])(##|#|bb|b)?/);
    if (!match) return null;
    
    const [, letter, accidental = ''] = match;
    const fullNote = letter.toUpperCase() + accidental.toLowerCase();
    
    return noteMap[fullNote] ?? null;
};

// Helper to parse chord notes string into normalized note numbers (0-11)
const parseChordNotes = (notesString: string): number[] => {
    const notes = parseNotes(notesString);
    return notes.map(note => noteNameToNumber(note)).filter(n => n !== null) as number[];
};

// Helper to count shared notes between two sets of note numbers
const countSharedNotes = (notes1: number[], notes2: number[]): number => {
    const set1 = new Set(notes1);
    const set2 = new Set(notes2);
    
    let count = 0;
    for (const note of set1) {
        if (set2.has(note)) {
            count++;
        }
    }
    
    return count;
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

    // Find the original chord definition, handling duplicate names by comparing note numbers
    const findOriginalChordFromLibrary = async (chord: AddedChord): Promise<string | null> => {
        // Extract base chord name (remove slash note if present)
        const baseChordName = chord.name.replace(/\/[A-G](##|#|bb|b)?\d*/, '');
        
        console.log('Looking for base chord:', baseChordName);
        
        const chords = await dataService.getAllDistinctChords();
        
        // First try: Look in the current chords library
        if (chords) {
            const matchingChords = chords.filter(c => c.chordName === baseChordName);
            
            if (matchingChords.length === 0) {
                // No matches found, continue to API fallback
                console.log('No matches found in library for:', baseChordName);
            } else {
                // Always compare notes to find best match, even with single result
                console.log(`Found ${matchingChords.length} chord(s) with name "${baseChordName}", comparing notes to find best match...`);
                
                // Get current chord's note numbers (excluding any manually added slash note)
                const currentNoteNumbers = parseChordNotes(chord.originalNotes || chord.notes);
                console.log('Current chord note numbers:', currentNoteNumbers, 'from:', chord.originalNotes || chord.notes);
                
                let bestMatch = matchingChords[0];
                let maxSharedNotes = 0;
                
                for (const candidate of matchingChords) {
                    if (candidate.chordNoteNames) {
                        const candidateNoteNumbers = parseChordNotes(candidate.chordNoteNames);
                        const sharedCount = countSharedNotes(currentNoteNumbers, candidateNoteNumbers);
                        
                        console.log(`  - Candidate notes: ${candidate.chordNoteNames} (note numbers: ${candidateNoteNumbers}) - ${sharedCount} shared notes`);
                        
                        if (sharedCount > maxSharedNotes) {
                            maxSharedNotes = sharedCount;
                            bestMatch = candidate;
                        }
                    }
                }
                
                if (bestMatch?.chordNoteNames && maxSharedNotes > 0) {
                    console.log(`✓ Best match selected (${maxSharedNotes} shared notes):`, bestMatch.chordNoteNames);
                    return bestMatch.chordNoteNames;
                } else {
                    console.warn(`✗ No good match found (max shared notes: ${maxSharedNotes})`);
                    // Continue to API fallback
                }
            }
        }
        
        // Second try: Use API to fetch the base chord if we have context
        if (chord.originalKey && chord.originalMode && onFetchOriginalChord) {
            try {
                console.log('Fetching base chord', baseChordName, 'from API');
                const originalNotes = await onFetchOriginalChord(baseChordName, chord.originalKey, chord.originalMode);
                if (originalNotes) {
                    console.log('Fetched base chord from API:', originalNotes);
                    return originalNotes;
                }
            } catch (error) {
                console.warn('Failed to fetch base chord from API:', error);
            }
        }
        
        console.warn('Could not find base chord definition for:', baseChordName);
        return null;
    };

    // Simplified removeSlashNote - just find and use the base chord
    const removeSlashNote = async () => {
        setSlashNote('');
        setSlashNoteError('');
        
        if (!editingChord) return;
        
        try {
            //console.log('Removing slash note, finding base chord for:', editingChord.name);
            
            // Get the base chord definition
            const baseChordNotes = await findOriginalChordFromLibrary(editingChord);
            
            if (baseChordNotes) {
                // Validate the notes are in the correct format
                const parsedNotes = parseNotes(baseChordNotes);
                const hasValidNoteNames = parsedNotes.every(note => {
                    return /^[A-Ga-g]/.test(note.trim()) && isValidNoteName(note.trim());
                });
                
                if (hasValidNoteNames) {
                    console.log('Reverting to base chord notes:', baseChordNotes);
                    setEditingChord({
                        ...editingChord,
                        notes: baseChordNotes
                    });
                    return;
                } else {
                    console.warn('Base chord notes are in invalid format:', baseChordNotes);
                }
            }
            
            // If we can't find the base chord, just remove the first note (which should be the slash note)
            const currentNotes = parseNotes(editingChord.notes);
            if (currentNotes.length > 1) {
                // Check if the first note matches our slash note
                const firstNote = currentNotes[0];
                const slashNoteNameOnly = slashNote.replace(/\d+/, '');
                const firstNoteNameOnly = firstNote.replace(/\d+/, '');
                
                if (firstNoteNameOnly === slashNoteNameOnly) {
                    // Remove the first note (slash note) and keep the rest
                    const notesWithoutSlash = currentNotes.slice(1);
                    const revertedNotes = notesToString(notesWithoutSlash);
                    console.log('Removing slash note manually, result:', revertedNotes);
                    setEditingChord({
                        ...editingChord,
                        notes: revertedNotes
                    });
                    return;
                }
            }
            
            console.warn('Could not revert slash note - no base chord found and no obvious slash note to remove');
            
        } catch (error) {
            console.error('Error removing slash note:', error);
        }
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

        const slashMatch = chord.name.match(/\/([A-G](##|#|bb|b)?\d*)/);

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

            let updatedName = editingChord.name.replace(/\/[A-G](##|#|bb|b)?\d*/, '');
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