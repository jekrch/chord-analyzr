import { create } from 'zustand';
import { GlobalPatternState } from './types';

interface PatternState {
    // State
    globalPatternState: GlobalPatternState;
    currentlyActivePattern: string[];
    
    // Actions
    setGlobalPatternState: (updates: Partial<GlobalPatternState>) => void;
    setCurrentlyActivePattern: (pattern: string[]) => void;
    togglePlayback: () => void;
    updatePattern: (newPatternState: Partial<GlobalPatternState>) => void;
}

export const usePatternStore = create<PatternState>((set, get) => ({
    // Initial state
    globalPatternState: {
        currentPattern: ['1', '2', '3', '4'],
        isPlaying: false,
        bpm: 120,
        subdivision: 0.25,
        swing: 0,
        currentStep: 0,
        repeat: true,
        lastChordChangeTime: 0,
        globalClockStartTime: 0,
    },
    currentlyActivePattern: ['1', '2', '3', '4'],

    // Actions
    setGlobalPatternState: (updates: Partial<GlobalPatternState>) =>
        set(state => ({
            globalPatternState: { ...state.globalPatternState, ...updates }
        })),

    setCurrentlyActivePattern: (pattern: string[]) =>
        set({ currentlyActivePattern: pattern }),

    togglePlayback: () => {
        const { globalPatternState } = get();
        const newIsPlaying = !globalPatternState.isPlaying;
        
        set(state => ({
            globalPatternState: {
                ...state.globalPatternState,
                isPlaying: newIsPlaying,
            }
        }));
    },

    updatePattern: (newPatternState: Partial<GlobalPatternState>) => {
        set(state => ({
            globalPatternState: {
                ...state.globalPatternState,
                ...newPatternState,
            }
        }));
    },
}));