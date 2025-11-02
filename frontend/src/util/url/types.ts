// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AddedChord {
    name: string;
    notes: string;
    pattern: string[];
    originalKey: string;
    originalMode?: string;
    originalNotes?: string;
}

export interface ChordTypesMap {
    [key: string]: number[];
}

export interface ModeScaleChordDto {
    chordName?: string;
    chordNoteNames?: string;
}

export interface PianoSettings {
    instrumentName: string;
    cutOffPreviousNotes: boolean;
    eq: {
        bass: number;
        mid: number;
        treble: number;
    };
    octaveOffset: number;
    reverbLevel: number;
    noteDuration: number;
    volume: number;
    chorusLevel: number;
    delayLevel: number;
    distortionLevel: number;
    bitcrusherLevel: number;
    phaserLevel: number;
    flangerLevel: number;
    ringModLevel: number;
    autoFilterLevel: number;
    tremoloLevel: number;
    stereoWidthLevel: number;
    compressorLevel: number;
}

export interface EncodedState {
    key: string;
    mode: string;
    pattern: string[];
    bpm: number;
    subdivision: number;
    swing: number;
    showPattern: boolean;
    liveMode: boolean;
    addedChords: AddedChord[];
    pianoSettings: PianoSettings;
}

export interface ParsedNote {
    encodedNote: string;
    remaining: string;
}

export interface EffectConfig {
    key: keyof PianoSettings;
    default: number;
}

export interface TimingData {
    bpm: number;
    subdivision: number;
    swing: number;
    showPattern: boolean;
    liveMode: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VERSION = 'v9';

export const LIMITS = {
    BPM_MIN: 60,
    BPM_MAX: 200,
    SWING_MAX: 50,
    EQ_OFFSET: 24,
    OCTAVE_OFFSET: 3,
    PATTERN_MAX_LENGTH: 16,
    EFFECT_SCALE: 35
} as const;

export const DEFAULTS = {
    INSTRUMENT_INDEX: 0,
    CUT_OFF: true,
    EQ: { bass: 0, mid: 0, treble: 0 },
    OCTAVE_OFFSET: 0,
    NOTE_DURATION: 0.8,
    VOLUME: 0.8,
    BPM: 120,
    SUBDIVISION: 0.25,
    SWING: 0,
    SHOW_PATTERN: false,
    LIVE_MODE: false
} as const;

export const EFFECTS: EffectConfig[] = [
    { key: 'reverbLevel', default: 0 },
    { key: 'chorusLevel', default: 0 },
    { key: 'delayLevel', default: 0 },
    { key: 'distortionLevel', default: 0 },
    { key: 'bitcrusherLevel', default: 0 },
    { key: 'phaserLevel', default: 0 },
    { key: 'flangerLevel', default: 0 },
    { key: 'ringModLevel', default: 0 },
    { key: 'autoFilterLevel', default: 0 },
    { key: 'tremoloLevel', default: 0 },
    { key: 'stereoWidthLevel', default: 0 },
    { key: 'compressorLevel', default: 0 }
];

export const SUBDIVISION_MAP: { [key: number]: string } = {
    0.125: '0', 0.25: '1', 0.5: '2', 1.0: '3', 2.0: '4'
};

export const SUBDIVISION_REVERSE: { [key: string]: number } = {
    '0': 0.125, '1': 0.25, '2': 0.5, '3': 1.0, '4': 2.0
};

// Note mappings
export const NOTE_TO_PITCH: Record<string, string> = {
    'C': '0', 'D': '1', 'E': '2', 'F': '3', 'G': '4', 'A': '5', 'B': '6'
};

export const PITCH_TO_NOTE: Record<string, string> = {
    '0': 'C', '1': 'D', '2': 'E', '3': 'F', '4': 'G', '5': 'A', '6': 'B'
};

export const CHROMATIC_NOTE_TO_INDEX: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0,
    'C##': 2, 'Cbb': 10, 'D##': 4, 'Dbb': 0, 'E##': 6, 'Ebb': 2,
    'F##': 7, 'Fbb': 3, 'G##': 9, 'Gbb': 5, 'A##': 11, 'Abb': 7,
    'B##': 1, 'Bbb': 9
};

export const INDEX_TO_CHROMATIC_NOTE: string[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];