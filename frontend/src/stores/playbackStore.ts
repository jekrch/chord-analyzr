import { create } from 'zustand';
import { ActiveNoteInfo, AddedChord } from './types';
import { dataService } from '../services/DataService';

const START_OCTAVE = 4;
const END_OCTAVE = 7;

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
}));