
import { useCallback } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import { dataService } from '../services/DataService';

// Extract chord transpose logic into reusable function with slash note support
export const useChordTranspose = () => {
    // Helper to extract slash note from chord name (e.g., "Cmaj7/E" -> "E")
    const extractSlashNote = (chordName: string): string | null => {
        const match = chordName.match(/\/([A-G](##|#|bb|b)?)/);
        return match ? match[1] : null;
    };

    // Helper to remove slash note from chord name (e.g., "Cmaj7/E" -> "Cmaj7")
    const removeSlashNote = (chordName: string): string => {
        return chordName.replace(/\/[A-G](##|#|bb|b)?/, '');
    };

    const transposeChords = useCallback(async (
        fromKey: string,
        fromMode: string,
        toKey: string,
        toMode: string
    ): Promise<void> => {
        //console.log('Transposing from', fromKey, fromMode, 'to', toKey, toMode);

        const currentAddedChords = usePlaybackStore.getState().addedChords;
        //console.log('Current chords to transpose:', currentAddedChords.length);

        if (currentAddedChords.length === 0) return;

        // Calculate transpose steps (only needed when key changes)
        const steps = fromKey !== toKey ? calculateTransposeSteps(fromKey, toKey) : 0;

        // Fetch new music data and all distinct chords
        const [newChords, allChords] = await Promise.all([
            dataService.getModeKeyChords(toKey, toMode),
            dataService.getAllDistinctChords(toKey, toMode)
        ]);

        // Transform each chord
        const transformedChords = currentAddedChords.map((chord: any) => {
            // Extract slash note before transposing
            const slashNote = extractSlashNote(chord.name);
            
            // Get base chord name without slash note
            const baseChordName = removeSlashNote(chord.name);
            
            // Transpose base chord name
            const transposedBaseChordName = steps !== 0 
                ? transposeChordName(baseChordName, steps) 
                : baseChordName;
            
            // Transpose slash note if it exists
            const transposedSlashNote = slashNote && steps !== 0 
                ? transposeChordName(slashNote, steps) 
                : slashNote;
            
            // Reconstruct chord name with transposed slash note
            const targetChordName = transposedSlashNote 
                ? `${transposedBaseChordName}/${transposedSlashNote}`
                : transposedBaseChordName;

            // PRESERVE CUSTOM PHRASING: Transpose the actual notes in their current order
            // The notes are already in the user's custom order (including slash note if present)
            // We just need to transpose them all by the same amount
            let transposedNotes: string;
            
            if (steps !== 0) {
                // Transpose all notes in their current order - this preserves custom phrasing
                // If there's a slash note at the beginning, it will stay at the beginning
                transposedNotes = transposeNotes(chord.notes, steps);
            } else {
                // No key change, just keep the notes as-is (mode change only)
                transposedNotes = chord.notes;
            }

            // Find matching chord in library to update originalNotes (for reference)
            let matchingChord = newChords.find(c => c.chordName === transposedBaseChordName) ||
                allChords.find(c => c.chordName === transposedBaseChordName);

            // Update originalNotes to reflect the library version in the new key
            const newOriginalNotes = matchingChord?.chordNoteNames || 
                (chord.originalNotes && steps !== 0 
                    ? transposeNotes(chord.originalNotes, steps) 
                    : chord.originalNotes || transposedNotes);

            return {
                ...chord,
                name: targetChordName,
                notes: transposedNotes, 
                originalKey: toKey,
                originalMode: toMode,
                originalNotes: newOriginalNotes
            };
        });

        // Update the playback store
        usePlaybackStore.getState().setAddedChords(transformedChords);
        //console.log('Transpose complete');
    }, []);

    return { transposeChords };
};

// Helper functions for transposition
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculate the number of semitone steps between two keys
 */
export const calculateTransposeSteps = (fromKey: string, toKey: string): number => {
    // Handle flats by converting to sharps
    const flatToSharp: { [key: string]: string } = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    
    const normalizedFrom = flatToSharp[fromKey] || fromKey;
    const normalizedTo = flatToSharp[toKey] || toKey;
    
    const fromIndex = NOTES.indexOf(normalizedFrom);
    const toIndex = NOTES.indexOf(normalizedTo);
    
    if (fromIndex === -1 || toIndex === -1) return 0;
    
    let steps = toIndex - fromIndex;
    // Normalize to range [-5, 6] for shortest path
    if (steps > 6) steps -= 12;
    if (steps < -5) steps += 12;
    
    return steps;
};

/**
 * Transpose a single note by the specified number of semitones
 * Handles natural notes, sharps, flats, double sharps, and double flats
 */
const transposeNote = (note: string, steps: number): string => {
    if (!note || note.length === 0) return note;
    
    const baseNote = note[0].toUpperCase();
    const accidental = note.slice(1);
    
    // Map natural notes to their semitone positions
    const naturalSemitones: { [key: string]: number } = {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    const baseSemitone = naturalSemitones[baseNote];
    if (baseSemitone === undefined) return note; // Unknown base note
    
    // Calculate accidental offset
    let accidentalOffset = 0;
    if (accidental === '#') accidentalOffset = 1;
    else if (accidental === 'b') accidentalOffset = -1;
    else if (accidental === '##') accidentalOffset = 2;
    else if (accidental === 'bb') accidentalOffset = -2;
    
    // Calculate current semitone and transpose
    const currentSemitone = (baseSemitone + accidentalOffset + 12) % 12;
    const newSemitone = (currentSemitone + steps + 12) % 12;
    
    return NOTES[newSemitone];
};

/**
 * Transpose a chord name by extracting and transposing the root note
 * Handles ##, bb, #, b, and natural roots
 */
export const transposeChordName = (chordName: string, steps: number): string => {
    if (!chordName || chordName.length === 0) return chordName;
    
    let rootNote = '';
    let suffix = '';
    
    // Check for double accidentals first (## or bb)
    if (chordName.length >= 3 && 
        (chordName.substring(1, 3) === '##' || chordName.substring(1, 3) === 'bb')) {
        rootNote = chordName.substring(0, 3);
        suffix = chordName.substring(3);
    } 
    // Then check for single accidentals
    else if (chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')) {
        rootNote = chordName.substring(0, 2);
        suffix = chordName.substring(2);
    } 
    // Natural note
    else if (chordName.length >= 1) {
        rootNote = chordName[0];
        suffix = chordName.substring(1);
    }
    
    const transposedRoot = transposeNote(rootNote, steps);
    return transposedRoot + suffix;
};

/**
 * Transpose a comma-separated list of notes (with optional whitespace)
 * Handles formats like "C, E, G, B" or "C,E,G,B" or "C E G B"
 */
export const transposeNotes = (notes: string, steps: number): string => {
    // Split by comma first (if present), otherwise by space
    const delimiter = notes.includes(',') ? ',' : ' ';
    
    return notes.split(delimiter)
        .map(note => note.trim()) // Remove whitespace
        .filter(note => note.length > 0) // Remove empty strings
        .map(note => transposeNote(note, steps))
        .join(', '); // Always rejoin with comma + space for consistency
};