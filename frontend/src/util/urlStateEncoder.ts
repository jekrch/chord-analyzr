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

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VERSION = 'v9';

const LIMITS = {
    BPM_MIN: 60,
    BPM_MAX: 200,
    SWING_MAX: 50,
    EQ_OFFSET: 24,
    OCTAVE_OFFSET: 3,
    PATTERN_MAX_LENGTH: 16,
    EFFECT_SCALE: 35
} as const;

const DEFAULTS = {
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

interface EffectConfig {
    key: keyof PianoSettings;
    default: number;
}

const EFFECTS: EffectConfig[] = [
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

const SUBDIVISION_MAP: { [key: number]: string } = {
    0.125: '0', 0.25: '1', 0.5: '2', 1.0: '3', 2.0: '4'
};

const SUBDIVISION_REVERSE: { [key: string]: number } = {
    '0': 0.125, '1': 0.25, '2': 0.5, '3': 1.0, '4': 2.0
};

// ============================================================================
// CHORD TYPE ENCODING (Dynamic based on chordTypes)
// ============================================================================

/**
 * Generate compact codes for all chord types
 * Single chars: 0-9, a-z, A-Z (62 codes)
 * Two chars: 10-1z, 20-2z, etc.
 */
const generateChordTypeCodes = (chordTypes: ChordTypesMap): {
    typeToCode: Record<string, string>;
    codeToType: Record<string, string>;
} => {
    const sortedTypes = Object.keys(chordTypes).sort((a, b) => {
        // Empty string first, then by length, then alphabetically
        if (a === '') return -1;
        if (b === '') return 1;
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });

    const typeToCode: Record<string, string> = {};
    const codeToType: Record<string, string> = {};

    let codeIdx = 0;

    // Generate codes
    const generateCode = (idx: number): string => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (idx < 62) {
            return chars[idx];
        } else {
            // Two character codes: 10, 11, ... 1z, 20, 21, ...
            const first = Math.floor((idx - 62) / 36);
            const second = (idx - 62) % 36;
            return (first + 1).toString() + chars[second];
        }
    };

    for (const type of sortedTypes) {
        const code = generateCode(codeIdx++);
        typeToCode[type] = code;
        codeToType[code] = type;
    }

    return { typeToCode, codeToType };
};

/**
 * Note name to numeric encoding for chord roots
 */
const NOTE_TO_PITCH: Record<string, string> = {
    'C': '0', 'D': '1', 'E': '2', 'F': '3', 'G': '4', 'A': '5', 'B': '6'
};

const PITCH_TO_NOTE: Record<string, string> = {
    '0': 'C', '1': 'D', '2': 'E', '3': 'F', '4': 'G', '5': 'A', '6': 'B'
};

/**
 * Chromatic note names to MIDI-style index (0-11)
 * C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
 */
const CHROMATIC_NOTE_TO_INDEX: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0,
    // Double sharps and flats
    'C##': 2, 'Cbb': 10, 'D##': 4, 'Dbb': 0, 'E##': 6, 'Ebb': 2,
    'F##': 7, 'Fbb': 3, 'G##': 9, 'Gbb': 5, 'A##': 11, 'Abb': 7,
    'B##': 1, 'Bbb': 9
};

const INDEX_TO_CHROMATIC_NOTE: string[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

interface ParsedNote {
    encodedNote: string;
    remaining: string;
}

/**
 * Parses the root note + accidentals from the start of a chord name.
 * Returns the encoded note and the remainder of the string (the chord type).
 */
const parseNoteFromChordName = (chordName: string): ParsedNote | null => {
    let pos = 0;
    const root = chordName[pos++];

    if (!NOTE_TO_PITCH[root]) {
        console.warn('Unknown root note:', root, 'in chord:', chordName);
        return null;
    }

    let encodedNote = NOTE_TO_PITCH[root];

    // Parse accidentals
    let accidentalCount = 0;
    let accidentalType = '';

    while (pos < chordName.length && (chordName[pos] === '#' || chordName[pos] === 'b')) {
        if (!accidentalType) {
            accidentalType = chordName[pos];
        } else if (chordName[pos] !== accidentalType) {
            console.warn('Mixed accidentals in chord name:', chordName);
            return null;
        }
        accidentalCount++;
        pos++;
    }

    if (accidentalCount === 2 && accidentalType === '#') {
        encodedNote += 'S'; // Double sharp
    } else if (accidentalCount === 2 && accidentalType === 'b') {
        encodedNote += 'F'; // Double flat
    } else if (accidentalCount === 1 && accidentalType === '#') {
        encodedNote += 's'; // Sharp
    } else if (accidentalCount === 1 && accidentalType === 'b') {
        encodedNote += 'f'; // Flat
    }

    const remaining = chordName.substring(pos);
    return { encodedNote, remaining };
};

/**
 * Decodes a compact note (e.g., "0s", "4f", "5S") back to standard form.
 */
const decodeNote = (encodedNote: string): string => {
    let pos = 0;

    // Parse pitch
    const pitch = encodedNote[pos++];
    const root = PITCH_TO_NOTE[pitch];
    if (!root) {
        console.warn('Unknown pitch code:', pitch);
        return '';
    }

    let noteName = root;

    // Parse accidental (if any)
    if (pos < encodedNote.length) {
        const acc = encodedNote[pos];
        if (acc === 'S') { noteName += '##'; pos++; }
        else if (acc === 'F') { noteName += 'bb'; pos++; }
        else if (acc === 's') { noteName += '#'; pos++; }
        else if (acc === 'f') { noteName += 'b'; pos++; }
    }

    // Check for extra chars? Only if they are not part of a valid note
    if (pos !== encodedNote.length) {
        console.warn('Extra characters in encoded note:', encodedNote);
    }

    return noteName;
};

/**
 * Encode chord notes like "C, E, G" or "A B C D E" into compact form
 * Format: base36 indices separated by hyphens (no spaces, no commas)
 * Examples: "C E G" → "0-4-7", "A, B, C, D, E" → "9-b-0-2-4"
 */
const encodeChordNotes = (notesString: string): string => {
    // Parse notes - handle both comma and space separation
    console.log('encoding notes:', notesString);
    const noteNames = notesString
        .split(/[,\s]+/)
        .map(n => n.trim())
        .filter(Boolean);

    const indices: string[] = [];

    for (const noteName of noteNames) {
        const index = CHROMATIC_NOTE_TO_INDEX[noteName];
        if (index !== undefined) {
            indices.push(index.toString(36)); // base36: 0-9,a,b
        } else {
            console.warn('Unknown note name:', noteName);
            return ''; // Fallback on error
        }
    }

    return indices.join('-');
};

/**
 * Decode compact chord notes back to standard format
 * Examples: "0-4-7" → "C E G", "9-b-0-2-4" → "A A# C D E"
 */
const decodeChordNotes = (encoded: string): string => {
    if (!encoded) return '';

    const indices = encoded.split('-');
    const noteNames: string[] = [];

    for (const indexStr of indices) {
        if (!indexStr) continue; // Skip empty strings

        const index = parseInt(indexStr, 36);
        if (index >= 0 && index < 12) {
            noteNames.push(INDEX_TO_CHROMATIC_NOTE[index]);
        } else {
            console.warn('Invalid note index:', indexStr, 'parsed as:', index);
        }
    }

    console.log('noteNames:', noteNames);
    return noteNames.join(', ');
};


/**
* Encode a chord name like "C#m7b5" or "Db6/9/Gb" into compact form
 * Format: pitch[acc].typeCode[/bassPitch[acc]]
 * Examples: "C#m7b5" → "0s.d", "Db6/9" → "1f.S", "A##maj7/C" → "5S.a/0"
 */
const encodeChordName = (chordName: string, typeToCode: Record<string, string>): string => {
    let bassNoteName: string | undefined;
    let mainChordName = chordName;

    // 1. Check for slash chord. Handles "C/G", "C#m7/G#", etc.
    // Use lastIndexOf to correctly parse "C(add9)/G" if types have slashes (though unlikely)
    const slashIndex = chordName.lastIndexOf('/');
    if (slashIndex > 0 && slashIndex < chordName.length - 1) { // e.g. C/G, not /G or C/
        mainChordName = chordName.substring(0, slashIndex);
        bassNoteName = chordName.substring(slashIndex + 1);
    }

    // 2. Encode the main chord (e.g., "C#m7b5")
    const mainChordParsed = parseNoteFromChordName(mainChordName);
    if (!mainChordParsed) return ''; // Error logged in helper

    const { encodedNote: encodedMainNote, remaining: chordType } = mainChordParsed;

    const typeCode = typeToCode[chordType];
    if (typeCode === undefined) {
        console.warn('Unknown chord type:', chordType, 'from chord:', mainChordName);
        return '';
    }

    let encodedChord = `${encodedMainNote}.${typeCode}`;

    // 3. Encode the bass note (if it exists)
    if (bassNoteName) {
        const bassNoteParsed = parseNoteFromChordName(bassNoteName);
        // Bass note *must not* have a chord type remaining
        if (!bassNoteParsed || bassNoteParsed.remaining.length > 0) {
            console.warn('Invalid bass note:', bassNoteName);
            return ''; // Fail fast if bass note is malformed
        }

        encodedChord += `/${bassNoteParsed.encodedNote}`;
    }

    return encodedChord;
};

/**
 * Decode compact chord name back to standard form
 * Examples: "0s.d" → "C#m7b5", "1f.S/4f" → "Db6/9/Gb"
 */
const decodeChordName = (encoded: string, codeToType: Record<string, string>): string => {
    let encodedBassNote: string | undefined;
    let encodedMainChord = encoded;

    // 1. Check for slash chord
    const slashIndex = encoded.lastIndexOf('/');
    if (slashIndex > 0 && slashIndex < encoded.length - 1) {
        encodedMainChord = encoded.substring(0, slashIndex);
        encodedBassNote = encoded.substring(slashIndex + 1);
    }

    // 2. Decode the main chord (e.g., "0s.d")
    const delimiterIndex = encodedMainChord.indexOf('.');
    if (delimiterIndex === -1) {
        console.warn('Invalid encoded chord (no delimiter):', encodedMainChord);
        return '';
    }

    const encodedMainNote = encodedMainChord.substring(0, delimiterIndex);
    const typeCode = encodedMainChord.substring(delimiterIndex + 1);

    const mainNote = decodeNote(encodedMainNote);
    const chordType = codeToType[typeCode];

    if (!mainNote) {
        console.warn('Failed to decode main note:', encodedMainNote);
        return '';
    }
    if (chordType === undefined) {
        console.warn('Unknown chord code:', typeCode, 'from encoded:', encodedMainChord);
        return mainNote; // Return just the note as a fallback
    }

    let decodedChord = mainNote + chordType;

    // 3. Decode the bass note (if it exists)
    if (encodedBassNote) {
        const bassNote = decodeNote(encodedBassNote);
        if (!bassNote) {
            console.warn('Failed to decode bass note:', encodedBassNote);
            // Fallback to just returning the main chord
        } else {
            decodedChord += `/${bassNote}`;
        }
    }

    return decodedChord;
};

// ============================================================================
// BASE36 ENCODING
// ============================================================================

const toBase36 = (num: number): string => Math.max(0, Math.round(num)).toString(36);
const fromBase36 = (str: string): number => parseInt(str, 36) || 0;

// ============================================================================
// PATTERN UTILITIES
// ============================================================================

/**
 * Normalize pattern for comparison (x -> 0)
 */
const normalizePattern = (pattern: string[]): string =>
    pattern.map(step => step.replace(/[xX]/gi, '0')).join('.');

// ============================================================================
// PIANO SETTINGS ENCODING (Optimized with Bitmask)
// ============================================================================

/**
 * Encode piano settings - ONLY non-default values using bitmask
 * Format: inst-cutOff-eq-octave-duration-volume-effectMask-effectValues
 * Sections after instrument can be omitted if at defaults
 */
const encodePianoSettings = (
    settings: PianoSettings,
    availableInstruments: string[]
): string => {
    const parts: string[] = [];

    // 1. Instrument (always included)
    const instIndex = availableInstruments.indexOf(settings.instrumentName);
    parts.push(toBase36(Math.max(0, instIndex)));

    // 2. Cut off (only if non-default)
    const cutOff = settings.cutOffPreviousNotes !== DEFAULTS.CUT_OFF
        ? (settings.cutOffPreviousNotes ? '1' : '0')
        : '';
    parts.push(cutOff);

    // 3. EQ - only if any value is non-zero
    const hasEQ = settings.eq.bass !== 0 || settings.eq.mid !== 0 || settings.eq.treble !== 0;
    const eq = hasEQ
        ? toBase36(settings.eq.bass + LIMITS.EQ_OFFSET) +
        toBase36(settings.eq.mid + LIMITS.EQ_OFFSET) +
        toBase36(settings.eq.treble + LIMITS.EQ_OFFSET)
        : '';
    parts.push(eq);

    // 4. Octave (only if non-default)
    const octave = settings.octaveOffset !== DEFAULTS.OCTAVE_OFFSET
        ? toBase36(settings.octaveOffset + LIMITS.OCTAVE_OFFSET)
        : '';
    parts.push(octave);

    // 5. Duration (only if non-default)
    const duration = Math.abs(settings.noteDuration - DEFAULTS.NOTE_DURATION) > 0.01
        ? toBase36(Math.max(0, Math.round(settings.noteDuration * 10) - 1))
        : '';
    parts.push(duration);

    // 6. Volume (only if non-default)  
    const volume = Math.abs(settings.volume - DEFAULTS.VOLUME) > 0.01
        ? toBase36(Math.round(settings.volume * LIMITS.EFFECT_SCALE))
        : '';
    parts.push(volume);

    // 7. Effects: Use bitmask to indicate which effects are active
    let effectMask = 0;
    const effectValues: string[] = [];

    EFFECTS.forEach((effect, index) => {
        const value = settings[effect.key] as number;
        if (value > 0.01) {
            effectMask |= (1 << index);
            effectValues.push(toBase36(Math.round(value * LIMITS.EFFECT_SCALE)));
        }
    });

    // Only include effects if there are any
    if (effectMask > 0) {
        parts.push(toBase36(effectMask));
        parts.push(effectValues.join(''));
    } else {
        parts.push('');
        parts.push('');
    }

    // Remove trailing empty parts
    while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop();
    }

    // Use hyphens instead of pipes
    return parts.join('-');
};

/**
 * Decode piano settings (supports v7, v8, v9)
 */
const decodePianoSettings = (
    encoded: string,
    availableInstruments: string[],
    version: string
): PianoSettings => {
    const settings: PianoSettings = {
        instrumentName: availableInstruments[DEFAULTS.INSTRUMENT_INDEX] || 'electric_piano_1',
        cutOffPreviousNotes: DEFAULTS.CUT_OFF,
        eq: { ...DEFAULTS.EQ },
        octaveOffset: DEFAULTS.OCTAVE_OFFSET,
        reverbLevel: 0,
        noteDuration: DEFAULTS.NOTE_DURATION,
        volume: DEFAULTS.VOLUME,
        chorusLevel: 0,
        delayLevel: 0,
        distortionLevel: 0,
        bitcrusherLevel: 0,
        phaserLevel: 0,
        flangerLevel: 0,
        ringModLevel: 0,
        autoFilterLevel: 0,
        tremoloLevel: 0,
        stereoWidthLevel: 0,
        compressorLevel: 0
    };

    // Support both old pipe format and new hyphen format
    const parts = encoded.split(/[-|]/);

    // 1. Instrument
    if (parts[0]) {
        settings.instrumentName = availableInstruments[fromBase36(parts[0])] ||
            availableInstruments[0] || 'electric_piano_1';
    }

    // v9 optimized format
    if (version === VERSION) {
        // 2. Cut off
        if (parts[1]) {
            settings.cutOffPreviousNotes = parts[1] === '1';
        }

        // 3. EQ
        if (parts[2] && parts[2].length >= 3) {
            settings.eq.bass = fromBase36(parts[2][0]) - LIMITS.EQ_OFFSET;
            settings.eq.mid = fromBase36(parts[2][1]) - LIMITS.EQ_OFFSET;
            settings.eq.treble = fromBase36(parts[2][2]) - LIMITS.EQ_OFFSET;
        }

        // 4. Octave
        if (parts[3]) {
            settings.octaveOffset = fromBase36(parts[3]) - LIMITS.OCTAVE_OFFSET;
        }

        // 5. Duration
        if (parts[4]) {
            settings.noteDuration = (fromBase36(parts[4]) + 1) / 10;
        }

        // 6. Volume
        if (parts[5]) {
            settings.volume = fromBase36(parts[5]) / LIMITS.EFFECT_SCALE;
        }

        // 7. Effects (bitmask + values)
        if (parts[6]) {
            const effectMask = fromBase36(parts[6]);
            const effectValues = parts[7] || '';
            let valueIndex = 0;

            EFFECTS.forEach((effect, index) => {
                if (effectMask & (1 << index)) {
                    if (valueIndex < effectValues.length) {
                        const value = fromBase36(effectValues[valueIndex]) / LIMITS.EFFECT_SCALE;
                        (settings[effect.key] as number) = value;
                        valueIndex++;
                    }
                }
            });
        }
    } else {
        // v7/v8 legacy format
        settings.cutOffPreviousNotes = (parts[1] || '1') === '1';
        settings.eq.bass = fromBase36(parts[2] || 'o') - LIMITS.EQ_OFFSET;
        settings.eq.mid = fromBase36(parts[3] || 'o') - LIMITS.EQ_OFFSET;
        settings.eq.treble = fromBase36(parts[4] || 'o') - LIMITS.EQ_OFFSET;
        settings.octaveOffset = fromBase36(parts[5] || '3') - LIMITS.OCTAVE_OFFSET;
        settings.reverbLevel = fromBase36(parts[6] || '0') / LIMITS.EFFECT_SCALE;
        settings.noteDuration = (fromBase36(parts[7] || '7') + 1) / 10;
        settings.volume = fromBase36(parts[8] || 'p') / LIMITS.EFFECT_SCALE;
        settings.chorusLevel = fromBase36(parts[9] || '0') / LIMITS.EFFECT_SCALE;
        settings.delayLevel = fromBase36(parts[10] || '0') / LIMITS.EFFECT_SCALE;

        if (version === 'v8') {
            settings.distortionLevel = fromBase36(parts[11] || '0') / LIMITS.EFFECT_SCALE;
            settings.bitcrusherLevel = fromBase36(parts[12] || '0') / LIMITS.EFFECT_SCALE;
            settings.phaserLevel = fromBase36(parts[13] || '0') / LIMITS.EFFECT_SCALE;
            settings.flangerLevel = fromBase36(parts[14] || '0') / LIMITS.EFFECT_SCALE;
            settings.ringModLevel = fromBase36(parts[15] || '0') / LIMITS.EFFECT_SCALE;
            settings.autoFilterLevel = fromBase36(parts[16] || '0') / LIMITS.EFFECT_SCALE;
            settings.tremoloLevel = fromBase36(parts[17] || '0') / LIMITS.EFFECT_SCALE;
            settings.stereoWidthLevel = fromBase36(parts[18] || '0') / LIMITS.EFFECT_SCALE;
            settings.compressorLevel = fromBase36(parts[19] || '0') / LIMITS.EFFECT_SCALE;
        }
    }

    return settings;
};

// ============================================================================
// TIMING ENCODING (Simplified - still include all parts for compatibility)
// ============================================================================

const encodeTiming = (
    bpm: number,
    subdivision: number,
    swing: number,
    showPattern: boolean,
    liveMode: boolean
): string => {
    const bpmClamped = Math.max(LIMITS.BPM_MIN, Math.min(LIMITS.BPM_MAX, bpm));
    const bpmEncoded = toBase36(bpmClamped - LIMITS.BPM_MIN);

    const sub = SUBDIVISION_MAP[subdivision] || '1';

    const swingClamped = Math.max(0, Math.min(LIMITS.SWING_MAX, swing));
    const swingEncoded = toBase36(swingClamped);

    const flags = (showPattern ? 2 : 0) + (liveMode ? 1 : 0);
    const f = toBase36(flags);

    // Use hyphens instead of pipes (pipes get URL encoded)
    return `${bpmEncoded}-${sub}-${swingEncoded}-${f}`;
};

const decodeTiming = (encoded: string): {
    bpm: number;
    subdivision: number;
    swing: number;
    showPattern: boolean;
    liveMode: boolean;
} => {
    // Support both old pipe format and new hyphen format
    const parts = encoded.split(/[-|]/);

    const bpm = parts[0] ? fromBase36(parts[0]) + LIMITS.BPM_MIN : DEFAULTS.BPM;
    const subdivision = parts[1] ? (SUBDIVISION_REVERSE[parts[1]] || DEFAULTS.SUBDIVISION) : DEFAULTS.SUBDIVISION;
    const swing = parts[2] ? fromBase36(parts[2]) : DEFAULTS.SWING;
    const flags = parts[3] ? fromBase36(parts[3]) : 0;

    return {
        bpm,
        subdivision,
        swing,
        showPattern: (flags & 2) !== 0,
        liveMode: (flags & 1) !== 0
    };
};

// ============================================================================
// MAIN ENCODE/DECODE FUNCTIONS
// ============================================================================

/**
 * Encodes application state into an optimized URL-safe string
 * Format v9: v9_k_m_pattern_timing_piano_chords
 * 
 * Key improvements over v8:
 * - Piano settings use bitmask for effects (30-50% savings)
 * - Omit default piano setting sections
 * - Compact chord name encoding (no URL encoding needed)
 * - Maintains backward compatibility
 */
export const encodeState = (
    key: string,
    mode: string,
    addedChords: AddedChord[],
    globalPattern: string[],
    bpm: number,
    subdivision: number,
    swing: number,
    showPattern: boolean,
    liveMode: boolean,
    pianoSettings: PianoSettings,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap
): string => {
    if (!chords?.length || !availableKeys.length || !availableModes.length) {
        return '';
    }

    try {
        // Generate chord type mappings
        const { typeToCode } = generateChordTypeCodes(chordTypes);

        // 1. Version
        const version = VERSION;

        // 2. Key
        const keyIndex = availableKeys.indexOf(key);
        const k = toBase36(Math.max(0, keyIndex));

        // 3. Mode
        const modeIndex = availableModes.indexOf(mode);
        const m = toBase36(Math.max(0, modeIndex));

        // 4. Pattern (keep dot-separated for safety with multi-char values)
        const p = globalPattern.slice(0, LIMITS.PATTERN_MAX_LENGTH)
            .map(step => step.replace(/[xX]/gi, '0'))
            .join('.');

        // 5. Timing
        const timing = encodeTiming(bpm, subdivision, swing, showPattern, liveMode);

        // 6. Piano settings (optimized with bitmask)
        const piano = encodePianoSettings(pianoSettings, availableInstruments);

        // 7. Chords (compact encoding - no URL encoding needed!)
        const globalPatternNormalized = normalizePattern(globalPattern);
        const chordData = addedChords.map(ac => {
            // Compact chord name encoding
            const compactName = encodeChordName(ac.name, typeToCode);
            if (!compactName) {
                console.warn('Failed to encode chord name:', ac.name);
                return '';
            }

            // Compact notes encoding - no URL encoding!
            const compactNotes = encodeChordNotes(ac.notes);
            if (!compactNotes) {
                console.warn('Failed to encode notes:', ac.notes);
                return '';
            }

            // Use 'n' as separator between name and notes (instead of ~)
            let chordId = `${compactName}n${compactNotes}`;

            // Add original key/mode if available (use 'k' prefix instead of @)
            if (ac.originalKey && ac.originalMode) {
                const origKeyIndex = availableKeys.indexOf(ac.originalKey);
                const origModeIndex = availableModes.indexOf(ac.originalMode);
                if (origKeyIndex >= 0 && origModeIndex >= 0) {
                    chordId += `k${toBase36(origKeyIndex)}${toBase36(origModeIndex)}`;
                }
            }

            // Compare patterns (use 'p' prefix for custom pattern)
            const chordPatternNormalized = normalizePattern(ac.pattern);

            if (chordPatternNormalized === globalPatternNormalized) {
                return chordId;
            } else {
                const customPattern = ac.pattern.slice(0, LIMITS.PATTERN_MAX_LENGTH)
                    .map(step => step.replace(/[xX]/gi, '0'))
                    .join('.');
                return `${chordId}p${customPattern}`;
            }
        }).filter(Boolean);

        // Use commas to separate chords (instead of pipes)
        const chordsStr = chordData.join(',');

        // Use underscore as main delimiter (like v7/v8)
        return `${version}_${k}_${m}_${p}_${timing}_${piano}_${chordsStr}`;

    } catch (error) {
        console.error('Failed to encode state:', error);
        return '';
    }
};

/**
 * Decodes a state string back into application state
 * Supports v7, v8, and v9 formats
 */
export const decodeState = (
    state: string,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap
): EncodedState | null => {
    console.log('Decoding state:', state);

    if (!state || !chords?.length || !availableKeys.length || !availableModes.length) {
        console.log('Cannot decode - missing data');
        return null;
    }

    try {
        const parts = state.split('_');

        const version = parts[0];
        if (!['v7', 'v8', 'v9'].includes(version) || parts.length < 6) {
            console.log('Invalid state format - only v7/v8/v9 supported');
            return null;
        }

        // Generate chord type mappings
        const { codeToType } = generateChordTypeCodes(chordTypes);

        // 1. Key
        const keyIndex = fromBase36(parts[1] || '0');
        const key = availableKeys[keyIndex] || availableKeys[0];

        // 2. Mode
        const modeIndex = fromBase36(parts[2] || '0');
        const mode = availableModes[modeIndex] || availableModes[0];

        // 3. Pattern (dot-separated)
        const patternStr = parts[3] || '1.2.3.4';
        const pattern = patternStr.split('.').map(c => c === '0' ? 'x' : c);

        // 4. Timing
        const timing = decodeTiming(parts[4] || '');

        // 5. Piano settings
        const pianoSettings = decodePianoSettings(parts[5] || '', availableInstruments, version);

        // 6. Chords
        const addedChords: AddedChord[] = [];
        const chordsPart = parts[6] || '';

        if (chordsPart) {
            // Support both old pipe separator and new comma separator
            const chordEntries = chordsPart.split(/[,|]/).filter(Boolean);

            for (const entry of chordEntries) {
                // Support both old colon and new 'p' prefix for custom patterns
                let chordIdPart: string;
                let patternPart: string | undefined;

                if (entry.includes('p')) {
                    // New format: split on last 'p' that comes after 'n'
                    const pIndex = entry.lastIndexOf('p');
                    if (pIndex > entry.indexOf('n')) {
                        chordIdPart = entry.substring(0, pIndex);
                        patternPart = entry.substring(pIndex + 1);
                    } else {
                        chordIdPart = entry;
                    }
                } else if (entry.includes(':')) {
                    // Old format with colon
                    [chordIdPart, patternPart] = entry.split(':');
                } else {
                    chordIdPart = entry;
                }

                // Parse original key/mode (support both @ and k markers)
                let chordDataPart = chordIdPart;
                let originalKey: string | undefined;
                let originalMode: string | undefined;

                const atIndex = chordIdPart.indexOf('@');
                const kIndex = chordIdPart.indexOf('k');
                const markerIndex = kIndex >= 0 ? kIndex : atIndex;

                if (markerIndex >= 0) {
                    chordDataPart = chordIdPart.substring(0, markerIndex);
                    const origStr = chordIdPart.substring(markerIndex + 1);

                    if (origStr.length >= 2) {
                        const origKeyIndex = fromBase36(origStr[0]);
                        const origModeIndex = fromBase36(origStr[1]);
                        originalKey = availableKeys[origKeyIndex];
                        originalMode = availableModes[origModeIndex];
                    }
                }

                // Split name and notes (support both ~ and n separators)
                let compactOrEncodedName: string;
                let compactOrEncodedNotes: string;

                const nIndex = chordDataPart.indexOf('n');
                const tildeIndex = chordDataPart.indexOf('~');

                if (nIndex >= 0 && (tildeIndex === -1 || nIndex < tildeIndex)) {
                    // New format with 'n'
                    compactOrEncodedName = chordDataPart.substring(0, nIndex);
                    compactOrEncodedNotes = chordDataPart.substring(nIndex + 1);
                } else if (tildeIndex >= 0) {
                    // Old format with '~'
                    [compactOrEncodedName, compactOrEncodedNotes] = chordDataPart.split('~');
                } else {
                    console.warn('Invalid chord format - no separator:', entry);
                    continue;
                }

                if (compactOrEncodedName && compactOrEncodedNotes) {
                    // Decode chord name
                    let name: string;

                    if (version === VERSION && compactOrEncodedName.includes('.')) {
                        // v9 format - compact encoding
                        name = decodeChordName(compactOrEncodedName, codeToType);
                    } else {
                        // v7/v8 format - URL encoded
                        name = decodeURIComponent(compactOrEncodedName);
                    }

                    // Decode chord notes
                    let notes: string;

                    if (version === VERSION && compactOrEncodedNotes.includes('-') && !compactOrEncodedNotes.includes('%')) {
                        // v9 format - compact note indices (e.g., "0-4-7")
                        notes = decodeChordNotes(compactOrEncodedNotes);
                    } else {
                        // v7/v8 format - URL encoded notes
                        notes = decodeURIComponent(compactOrEncodedNotes);
                    }

                    // Pattern: use custom if provided, otherwise use global
                    let chordPattern: string[];
                    if (patternPart) {
                        chordPattern = patternPart.split('.').map(c => c === '0' ? 'x' : c);
                    } else {
                        chordPattern = [...pattern];
                    }

                    if (name && notes) {
                        addedChords.push({
                            name,
                            notes,
                            pattern: chordPattern,
                            originalKey: originalKey || key,
                            originalMode,
                            originalNotes: notes
                        });
                    }
                } else {
                    console.warn('Invalid chord format:', entry);
                }
            }
        }

        return {
            key,
            mode,
            pattern,
            ...timing,
            addedChords,
            pianoSettings
        };

    } catch (error) {
        console.error('Failed to decode state:', error);
        return null;
    }
};

// ============================================================================
// URL UTILITY FUNCTIONS
// ============================================================================

export const saveStateToUrl = (encodedState: string, paramName: string = 's'): void => {
    if (encodedState) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, encodedState);
        window.history.replaceState({}, '', url.toString());
    }
};

export const loadStateFromUrl = (paramName: string = 's'): string | null => {
    const url = new URL(window.location.href);
    return url.searchParams.get(paramName);
};

export const encodeAndSaveToUrl = (
    key: string,
    mode: string,
    addedChords: AddedChord[],
    globalPattern: string[],
    bpm: number,
    subdivision: number,
    swing: number,
    showPattern: boolean,
    liveMode: boolean,
    pianoSettings: PianoSettings,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap,
    paramName: string = 's'
): void => {
    const encoded = encodeState(
        key, mode, addedChords, globalPattern, bpm, subdivision, swing,
        showPattern, liveMode, pianoSettings, availableKeys, availableModes,
        availableInstruments, chords, chordTypes
    );
    saveStateToUrl(encoded, paramName);
};

export const loadAndDecodeFromUrl = (
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap,
    paramName: string = 's'
): EncodedState | null => {
    const stateString = loadStateFromUrl(paramName);
    if (!stateString) return null;
    return decodeState(stateString, availableKeys, availableModes, availableInstruments, chords, chordTypes);
};