import { create } from 'zustand';
import { PianoSettings } from './types';

const DEFAULT_INSTRUMENTS = [
    'electric_piano_1', 'acoustic_grand_piano', 'bright_acoustic_piano',
    'electric_grand_piano', 'honkytonk_piano', 'electric_piano_2', 'harpsichord', 'clavinet'
];

const getDefaultPianoSettings = (): PianoSettings => ({
    instrumentName: 'electric_piano_1',
    cutOffPreviousNotes: true,
    eq: { bass: 0, mid: 0, treble: 0 },
    octaveOffset: 0,
    reverbLevel: 0.0,
    noteDuration: 0.8,
    volume: 0.8,
    chorusLevel: 0.0,
    delayLevel: 0.0,
});

interface PianoState {
    // State
    pianoSettings: PianoSettings;
    availableInstruments: string[];
    
    // Actions
    updatePianoSettings: (updates: Partial<PianoSettings>) => void;
    setPianoInstrument: (instrumentName: string) => void;
    setCutOffPreviousNotes: (cutOffPreviousNotes: boolean) => void;
    setEq: (eq: { bass: number; mid: number; treble: number }) => void;
    setOctaveOffset: (octaveOffset: number) => void;
    setReverbLevel: (reverbLevel: number) => void;
    setNoteDuration: (noteDuration: number) => void;
    setVolume: (volume: number) => void;
    setChorusLevel: (chorusLevel: number) => void;
    setDelayLevel: (delayLevel: number) => void;
    setAvailableInstruments: (instruments: string[]) => void;
}

export const usePianoStore = create<PianoState>((set, get) => ({
    // Initial state
    pianoSettings: getDefaultPianoSettings(),
    availableInstruments: DEFAULT_INSTRUMENTS,

    // Actions
    updatePianoSettings: (updates: Partial<PianoSettings>) =>
        set(state => ({ pianoSettings: { ...state.pianoSettings, ...updates } })),

    setPianoInstrument: (instrumentName: string) =>
        get().updatePianoSettings({ instrumentName }),

    setCutOffPreviousNotes: (cutOffPreviousNotes: boolean) =>
        get().updatePianoSettings({ cutOffPreviousNotes }),

    setEq: (eq: { bass: number; mid: number; treble: number }) =>
        get().updatePianoSettings({ eq }),

    setOctaveOffset: (octaveOffset: number) =>
        get().updatePianoSettings({ octaveOffset }),

    setReverbLevel: (reverbLevel: number) =>
        get().updatePianoSettings({ reverbLevel }),

    setNoteDuration: (noteDuration: number) =>
        get().updatePianoSettings({ noteDuration }),

    setVolume: (volume: number) =>
        get().updatePianoSettings({ volume }),

    setChorusLevel: (chorusLevel: number) =>
        get().updatePianoSettings({ chorusLevel }),

    setDelayLevel: (delayLevel: number) =>
        get().updatePianoSettings({ delayLevel }),

    setAvailableInstruments: (instruments: string[]) =>
        set({ availableInstruments: instruments }),
}));