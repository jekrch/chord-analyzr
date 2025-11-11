import { create } from "zustand/react";
import { dataService } from "../services/DataService";
import { normalizeNoteName } from "../util/NoteUtil";
import { ModeScaleChordDto, ScaleNoteDto } from "../api";

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
    allDistinctChordsKey: string | null; // Track which key these chords are for
    allDistinctChordsMode: string | null; // Track which mode these chords are for
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
    allDistinctChordsKey: null,
    allDistinctChordsMode: null,
    loadingAllChords: false,
    showAllChords: false,

    // Actions
    setKey: (key: string) => {
        set({ 
            key,
            // Clear all distinct chords cache when key changes
            allDistinctChords: undefined,
            allDistinctChordsKey: null,
            allDistinctChordsMode: null
        });
        get().fetchMusicData(key, get().mode);
        
        // Refetch all distinct chords if they were being shown
        if (get().showAllChords) {
            get().fetchAllDistinctChords();
        }
    },

    setMode: (mode: string) => {
        set({ 
            mode,
            // Clear all distinct chords cache when mode changes
            allDistinctChords: undefined,
            allDistinctChordsKey: null,
            allDistinctChordsMode: null
        });
        get().fetchMusicData(get().key, mode);
        
        // Refetch all distinct chords if they were being shown
        if (get().showAllChords) {
            get().fetchAllDistinctChords();
        }
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
        set({ 
            key, 
            mode,
            // Clear all distinct chords cache when key/mode changes
            allDistinctChords: undefined,
            allDistinctChordsKey: null,
            allDistinctChordsMode: null
        });
        get().fetchMusicData(key, mode);
        
        // Refetch all distinct chords if they were being shown
        if (get().showAllChords) {
            get().fetchAllDistinctChords();
        }
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
        const { allDistinctChords, allDistinctChordsKey, allDistinctChordsMode, key, mode } = get();
        
        // Only fetch if we don't already have the data for the CURRENT key/mode
        if (allDistinctChords && allDistinctChordsKey === key && allDistinctChordsMode === mode) {
            return;
        }

        set({ loadingAllChords: true });

        try {
            const distinctChords = await dataService.getAllDistinctChords(key, mode);
            
            set({ 
                allDistinctChords: distinctChords,
                allDistinctChordsKey: key,
                allDistinctChordsMode: mode,
                loadingAllChords: false 
            });
        } catch (err) {
            console.error('Error fetching all distinct chords:', err);
            set({ loadingAllChords: false });
        }
    },

    toggleShowAllChords: () => {
        const { showAllChords, allDistinctChords, allDistinctChordsKey, allDistinctChordsMode, key, mode } = get();
        const newShowAllChords = !showAllChords;
        
        set({ showAllChords: newShowAllChords });
        
        // Fetch all distinct chords if we're switching to show them and either:
        // 1. Don't have them yet, or
        // 2. Have them but for a different key/mode
        if (newShowAllChords && (!allDistinctChords || allDistinctChordsKey !== key || allDistinctChordsMode !== mode)) {
            get().fetchAllDistinctChords();
        }
    },

    setShowAllChords: (show: boolean) => {
        const { allDistinctChords, allDistinctChordsKey, allDistinctChordsMode, key, mode } = get();
        
        set({ showAllChords: show });
        
        // Fetch all distinct chords if we're switching to show them and either:
        // 1. Don't have them yet, or
        // 2. Have them but for a different key/mode
        if (show && (!allDistinctChords || allDistinctChordsKey !== key || allDistinctChordsMode !== mode)) {
            get().fetchAllDistinctChords();
        }
    },

}));