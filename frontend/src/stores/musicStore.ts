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