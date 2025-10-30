
import { useCallback } from 'react';
import { usePlaybackStore, calculateTransposeSteps, transposeChordName, transposeNotes } from '../stores/playbackStore';
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
            dataService.getAllDistinctChords()
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
