export type { AddedChord, PianoSettings } from '../util/urlStateEncoder';
export type { ModeScaleChordDto, ScaleNoteDto } from '../api';

export interface ActiveNoteInfo {
    note: string;
    octave: number;
}

export interface GlobalPatternState {
    currentPattern: string[];
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
}

// src/stores/musicStore.ts
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

    setModes: (modes: string[]) => set({ modes }),

    fetchMusicData: async (key: string, mode: string) => {
        if (!key) return;
        
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
}));