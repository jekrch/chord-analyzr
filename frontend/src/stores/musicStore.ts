import { create } from 'zustand';
import { ModeScaleChordDto, ScaleNoteDto } from '../api';
import { dataService } from '../services/DataService';
import { normalizeNoteName } from '../util/NoteUtil';

interface MusicState {
    // State
    chords: ModeScaleChordDto[] | undefined;
    scaleNotes: ScaleNoteDto[];
    key: string;
    mode: string;
    modes: string[];
    loadingChords: boolean;
    normalizedScaleNotes: string[];

    // Actions
    setKey: (key: string) => void;
    setMode: (mode: string) => void;
    setModes: (modes: string[]) => void;
    fetchMusicData: (key: string, mode: string) => Promise<void>;
    setKeyAndMode: (key: string, mode: string) => void;
    initialize: () => Promise<void>;
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
}));
