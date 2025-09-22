import { create } from 'zustand';
import { ActiveNoteInfo, AddedChord, ModeScaleChordDto, ScaleNoteDto } from './types';
import { dataService } from '../services/DataService';
import { normalizeNoteName } from '../util/NoteUtil';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

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
 */
const transposeNote = (note: string, steps: number): string => {
    // Handle flats by converting to sharps
    const flatToSharp: { [key: string]: string } = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    
    let normalizedNote = note;
    if (flatToSharp[note]) {
        normalizedNote = flatToSharp[note];
    }
    
    const index = NOTES.indexOf(normalizedNote);
    if (index === -1) return note; // Return original if not found
    
    const newIndex = (index + steps + 12) % 12;
    return NOTES[newIndex];
};

/**
 * Transpose a chord name by extracting and transposing the root note
 */
export const transposeChordName = (chordName: string, steps: number): string => {
    // Extract root note (first 1-2 characters)
    let rootNote = '';
    let suffix = '';
    
    if (chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')) {
        rootNote = chordName.substring(0, 2);
        suffix = chordName.substring(2);
    } else if (chordName.length >= 1) {
        rootNote = chordName[0];
        suffix = chordName.substring(1);
    }
    
    const transposedRoot = transposeNote(rootNote, steps);
    return transposedRoot + suffix;
};

/**
 * Transpose a space-separated list of notes
 */
export const transposeNotes = (notes: string, steps: number): string => {
    return notes.split(' ')
        .map(note => transposeNote(note, steps))
        .join(' ');
};

// ============================================================================
// PLAYBACK STORE
// ============================================================================

interface PlaybackState {
    // State
    activeNotes: ActiveNoteInfo[];
    activeChordIndex: number | null;
    highlightedChordIndex: number | null;
    addedChords: AddedChord[];
    temporaryChord: { name: string; notes: string } | null;
    isPlayingScale: boolean;
    scalePlaybackTimeouts: NodeJS.Timeout[];

    // Actions
    setActiveNotes: (notes: ActiveNoteInfo[]) => void;
    setAddedChords: (chords: AddedChord[]) => void;
    setActiveChordIndex: (index: number | null) => void;
    setHighlightedChordIndex: (index: number | null) => void;
    setTemporaryChord: (chord: { name: string; notes: string } | null) => void;
    setIsPlayingScale: (isPlaying: boolean) => void;
    addChord: (chordName: string, chordNotes: string, pattern: string[], key: string, mode: string) => void;
    updateChord: (chordIndex: number, updatedChord: AddedChord) => void;
    removeChord: (indexToRemove: number) => void;
    clearAllChords: () => void;
    updateChordPattern: (chordIndex: number, newPattern: string[]) => void;
    playNotes: (notes: ActiveNoteInfo[]) => void;
    handleFetchOriginalChord: (chordName: string, key: string, mode: string) => Promise<string | null>;
    addScalePlaybackTimeout: (timeout: NodeJS.Timeout) => void;
    clearScalePlaybackTimeouts: () => void;
    transposeAddedChords: (fromKey: string, toKey: string, toMode: string) => Promise<void>;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
    // Initial state
    activeNotes: [],
    activeChordIndex: null,
    highlightedChordIndex: null,
    addedChords: [],
    temporaryChord: null,
    isPlayingScale: false,
    scalePlaybackTimeouts: [],

    // Actions
    setActiveNotes: (notes: ActiveNoteInfo[]) => set({ activeNotes: notes }),

    setAddedChords: (chords: AddedChord[]) => set({ addedChords: chords }),

    setActiveChordIndex: (index: number | null) => set({ activeChordIndex: index }),

    setHighlightedChordIndex: (index: number | null) => set({ highlightedChordIndex: index }),

    setTemporaryChord: (chord: { name: string; notes: string } | null) => set({ temporaryChord: chord }),

    setIsPlayingScale: (isPlaying: boolean) => set({ isPlayingScale: isPlaying }),

    addChord: (chordName: string, chordNotes: string, pattern: string[], key: string, mode: string) =>
        set(state => ({
            addedChords: [...state.addedChords, {
                name: chordName,
                notes: chordNotes,
                pattern: [...pattern],
                originalKey: key,
                originalMode: mode,
                originalNotes: chordNotes
            } as AddedChord]
        })),

    updateChord: (chordIndex: number, updatedChord: AddedChord) =>
        set(state => {
            const newChords = [...state.addedChords];
            newChords[chordIndex] = { ...updatedChord };
            return { addedChords: newChords };
        }),

    removeChord: (indexToRemove: number) =>
        set(state => {
            const newChords = state.addedChords.filter((_, index) => index !== indexToRemove);
            let newActiveChordIndex = state.activeChordIndex;

            if (state.activeChordIndex === indexToRemove) {
                newActiveChordIndex = null;
            } else if (state.activeChordIndex !== null && state.activeChordIndex > indexToRemove) {
                newActiveChordIndex = state.activeChordIndex - 1;
            }

            return {
                addedChords: newChords,
                activeChordIndex: newActiveChordIndex
            };
        }),

    clearAllChords: () => set({
        addedChords: [],
        activeChordIndex: null,
        temporaryChord: null,
    }),

    updateChordPattern: (chordIndex: number, newPattern: string[]) =>
        set(state => {
            const updated = [...state.addedChords];
            updated[chordIndex] = { ...updated[chordIndex], pattern: [...newPattern] };
            return { addedChords: updated };
        }),

    playNotes: (notes: ActiveNoteInfo[]) => {
        set({ activeNotes: [] });
        setTimeout(() => set({ activeNotes: notes }), 10);
    },

    handleFetchOriginalChord: async (chordName: string, key: string, mode: string): Promise<string | null> => {
        try {
            const modeKeyChords = await dataService.getModeKeyChords(key, mode);
            console.log('Fetching original chord for', chordName, 'in', key, mode);
            console.log('Fetched modeKeyChords from dataService:', modeKeyChords);
            const originalChord = modeKeyChords.find(chord => chord.chordName === chordName);
            console.log('Fetched original chord from dataService:', originalChord);
            return originalChord?.chordNoteNames || null;
        } catch (error) {
            console.error('Failed to fetch original chord:', error);
            return null;
        }
    },

    addScalePlaybackTimeout: (timeout: NodeJS.Timeout) =>
        set(state => ({ scalePlaybackTimeouts: [...state.scalePlaybackTimeouts, timeout] })),

    clearScalePlaybackTimeouts: () => {
        const { scalePlaybackTimeouts } = get();
        scalePlaybackTimeouts.forEach(clearTimeout);
        set({ scalePlaybackTimeouts: [] });
    },

    /**
     * Transpose all added chords from one key to another
     * If the transposed chord exists in the new key/mode, use those notes
     */
    transposeAddedChords: async (fromKey: string, toKey: string, toMode: string) => {
        const { addedChords, handleFetchOriginalChord } = get();
        
        console.log(`Transposing added chords from ${fromKey} to ${toKey} (${toMode})`);
        console.log(addedChords)
        // Calculate the number of semitone steps
        const steps = calculateTransposeSteps(fromKey, toKey);
        
        // if (steps === 0 && addedChords.length > 0 && addedChords[0].originalKey === toKey) {
        //     // No transposition needed
        //     return;
        // }
        
        const transposedChords = await Promise.all(
            addedChords.map(async (chord) => {
                // Transpose the chord name
                const transposedChordName = transposeChordName(chord.name, steps);

                console.log(`Transposing chord ${chord.name} (${chord.notes}) from ${fromKey} to ${toKey}: ${transposedChordName}`);
                // Try to fetch the chord from the new key/mode
                const newChordNotes = await handleFetchOriginalChord(transposedChordName, toKey, toMode);
                
                if (newChordNotes) {
                    // Chord exists in new key, use those notes
                    return {
                        ...chord,
                        name: transposedChordName,
                        notes: newChordNotes,
                        originalKey: toKey,
                        originalMode: toMode,
                        originalNotes: newChordNotes
                    } as AddedChord;
                } else {
                    // Chord doesn't exist in new key, manually transpose the notes
                    const transposedNotes = transposeNotes(chord.notes, steps);
                    const transposedOriginalNotes = chord.originalNotes 
                        ? transposeNotes(chord.originalNotes, steps) 
                        : transposedNotes;
                    
                    return {
                        ...chord,
                        name: transposedChordName,
                        notes: transposedNotes,
                        originalNotes: transposedOriginalNotes
                        // Keep originalKey and originalMode as they were
                    } as AddedChord;
                }
            })
        );
        
        set({ addedChords: transposedChords });
    },
}));

// ============================================================================
// MUSIC STORE
// ============================================================================

interface MusicState {
    // State
    chords: ModeScaleChordDto[] | undefined;
    scaleNotes: ScaleNoteDto[];
    key: string;
    mode: string;
    modes: string[];
    loadingChords: boolean;
    normalizedScaleNotes: string[];
    
    // All distinct chords state
    allDistinctChords: ModeScaleChordDto[] | undefined;
    loadingAllChords: boolean;
    showAllChords: boolean;

    // Actions
    setKey: (key: string) => void;
    setMode: (mode: string) => void;
    setModes: (modes: string[]) => void;
    fetchMusicData: (key: string, mode: string) => Promise<void>;
    setKeyAndMode: (key: string, mode: string) => void;
    initialize: () => Promise<void>;
    
    // All distinct chords actions
    fetchAllDistinctChords: () => Promise<void>;
    toggleShowAllChords: () => void;
    setShowAllChords: (show: boolean) => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
    // Initial state
    chords: undefined,
    scaleNotes: [],
    key: 'C',
    mode: 'Ionian',
    modes: [],
    loadingChords: false,
    normalizedScaleNotes: [],
    
    // All distinct chords initial state
    allDistinctChords: undefined,
    loadingAllChords: false,
    showAllChords: false,

    // Actions
    setKey: (key: string) => {
        set({ key });
        get().fetchMusicData(key, get().mode);
    },

    setMode: (mode: string) => {
        set({ mode });
        get().fetchMusicData(get().key, mode);
    },

    setModes: (modes: string[]) => {
        set({ modes });
        // Auto-fetch data when modes are first set (app initialization)
        const { key, mode, chords } = get();
        if (!chords && key && mode) {
            get().fetchMusicData(key, mode);
        }
    },

    setKeyAndMode: (key: string, mode: string) => {
        set({ key, mode });
        get().fetchMusicData(key, mode);
    },

    fetchMusicData: async (key: string, mode: string) => {
        if (!key || !mode) return;

        set({ loadingChords: true });

        try {
            const [chordsData, scaleData] = await Promise.all([
                dataService.getModeKeyChords(key, mode),
                dataService.getScaleNotes(key, mode)
            ]);

            const normalizedScaleNotes = scaleData
                .map(scaleNote => scaleNote.noteName ? normalizeNoteName(scaleNote.noteName) : null)
                .filter(Boolean) as string[];

            set({
                chords: chordsData,
                scaleNotes: scaleData,
                normalizedScaleNotes,
                loadingChords: false
            });
        } catch (err) {
            console.error('Error fetching music data:', err);
            set({ loadingChords: false });
        }
    },

    // Add initialization method
    initialize: async () => {
        const { key, mode } = get();
        await get().fetchMusicData(key, mode);
    },

    // All distinct chords actions
    fetchAllDistinctChords: async () => {
        const { allDistinctChords } = get();
        
        // Only fetch if we don't already have the data
        if (allDistinctChords) {
            return;
        }

        set({ loadingAllChords: true });

        try {
            const distinctChords = await dataService.getAllDistinctChords();
            set({ 
                allDistinctChords: distinctChords,
                loadingAllChords: false 
            });
        } catch (err) {
            console.error('Error fetching all distinct chords:', err);
            set({ loadingAllChords: false });
        }
    },

    toggleShowAllChords: () => {
        const { showAllChords, allDistinctChords } = get();
        const newShowAllChords = !showAllChords;
        
        set({ showAllChords: newShowAllChords });
        
        // Fetch all distinct chords if we're switching to show them and don't have them yet
        if (newShowAllChords && !allDistinctChords) {
            get().fetchAllDistinctChords();
        }
    },

    setShowAllChords: (show: boolean) => {
        set({ showAllChords: show });
        
        // Fetch all distinct chords if we're switching to show them and don't have them yet
        if (show && !get().allDistinctChords) {
            get().fetchAllDistinctChords();
        }
    },

}));