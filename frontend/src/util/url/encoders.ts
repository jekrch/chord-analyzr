import {
    ChordTypesMap,
    PianoSettings,
    ParsedNote,
    TimingData,
    VERSION,
    LIMITS,
    DEFAULTS,
    EFFECTS,
    SUBDIVISION_MAP,
    SUBDIVISION_REVERSE,
    NOTE_TO_PITCH,
    PITCH_TO_NOTE,
    CHROMATIC_NOTE_TO_INDEX,
    INDEX_TO_CHROMATIC_NOTE
} from './types';

// ============================================================================
// BASE36 ENCODING UTILITIES
// ============================================================================

export const toBase36 = (num: number): string => Math.max(0, Math.round(num)).toString(36);
export const fromBase36 = (str: string): number => parseInt(str, 36) || 0;

// ============================================================================
// CHORD TYPE ENCODING
// ============================================================================

export const generateChordTypeCodes = (chordTypes: ChordTypesMap): {
    typeToCode: Record<string, string>;
    codeToType: Record<string, string>;
} => {
    const sortedTypes = Object.keys(chordTypes).sort((a, b) => {
        if (a === '') return -1;
        if (b === '') return 1;
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });

    const typeToCode: Record<string, string> = {};
    const codeToType: Record<string, string> = {};

    const generateCode = (idx: number): string => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (idx < 62) {
            return chars[idx];
        } else {
            const first = Math.floor((idx - 62) / 36);
            const second = (idx - 62) % 36;
            return (first + 1).toString() + chars[second];
        }
    };

    sortedTypes.forEach((type, idx) => {
        const code = generateCode(idx);
        typeToCode[type] = code;
        codeToType[code] = type;
    });

    return { typeToCode, codeToType };
};

// ============================================================================
// NOTE ENCODING/DECODING
// ============================================================================

export const parseNoteFromChordName = (chordName: string): ParsedNote | null => {
    let pos = 0;
    const root = chordName[pos++];
        console.log('test')
    if (!NOTE_TO_PITCH[root]) {
        console.warn('Unknown root note:', root, 'in chord:', chordName);
        return null;
    }

    let encodedNote = NOTE_TO_PITCH[root];
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
        encodedNote += 'S';
    } else if (accidentalCount === 2 && accidentalType === 'b') {
        encodedNote += 'F';
    } else if (accidentalCount === 1 && accidentalType === '#') {
        encodedNote += 's';
    } else if (accidentalCount === 1 && accidentalType === 'b') {
        encodedNote += 'f';
    }

    return { encodedNote, remaining: chordName.substring(pos) };
};

export const decodeNote = (encodedNote: string): string => {
    let pos = 0;
    const pitch = encodedNote[pos++];
    const root = PITCH_TO_NOTE[pitch];
    
    if (!root) {
        console.warn('Unknown pitch code:', pitch);
        return '';
    }

    let noteName = root;

    if (pos < encodedNote.length) {
        const acc = encodedNote[pos];
        if (acc === 'S') { noteName += '##'; pos++; }
        else if (acc === 'F') { noteName += 'bb'; pos++; }
        else if (acc === 's') { noteName += '#'; pos++; }
        else if (acc === 'f') { noteName += 'b'; pos++; }
    }

    if (pos !== encodedNote.length) {
        console.warn('Extra characters in encoded note:', encodedNote);
    }

    return noteName;
};

// ============================================================================
// CHORD NOTES ENCODING/DECODING
// ============================================================================

export const encodeChordNotes = (notesString: string): string => {
    console.log('encoding notes:', notesString);
    const noteNames = notesString
        .split(/[,\s]+/)
        .map(n => n.trim())
        .filter(Boolean);

    const indices: string[] = [];

    for (const noteName of noteNames) {
        const index = CHROMATIC_NOTE_TO_INDEX[noteName];
        if (index !== undefined) {
            indices.push(index.toString(36));
        } else {
            console.warn('Unknown note name:', noteName);
            return '';
        }
    }

    return indices.join('-');
};

export const decodeChordNotes = (encoded: string): string => {
    if (!encoded) return '';

    const indices = encoded.split('-');
    const noteNames: string[] = [];

    for (const indexStr of indices) {
        if (!indexStr) continue;

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

// ============================================================================
// CHORD NAME ENCODING/DECODING
// ============================================================================

export const encodeChordName = (chordName: string, typeToCode: Record<string, string>): string => {
    let bassNoteName: string | undefined;
    let mainChordName = chordName;

    const slashIndex = chordName.lastIndexOf('/');
    if (slashIndex > 0 && slashIndex < chordName.length - 1) {
        const potentialBassNote = chordName.substring(slashIndex + 1);
        
        // Validate it's a bass note (A-G followed by optional accidentals, nothing else)
        if (/^[A-G](?:##|#|bb|b)?$/.test(potentialBassNote)) {
            mainChordName = chordName.substring(0, slashIndex);
            bassNoteName = potentialBassNote;
        }
        // Otherwise, the slash is part of the chord type (like m/Maj7)
    }

    const mainChordParsed = parseNoteFromChordName(mainChordName);
    if (!mainChordParsed) return '';

    const { encodedNote: encodedMainNote, remaining: chordType } = mainChordParsed;
    const typeCode = typeToCode[chordType];
    
    if (typeCode === undefined) {
        console.warn('Unknown chord type:', chordType, 'from chord:', mainChordName);
        return '';
    }

    let encodedChord = `${encodedMainNote}.${typeCode}`;

    if (bassNoteName) {
        const bassNoteParsed = parseNoteFromChordName(bassNoteName);
        if (!bassNoteParsed || bassNoteParsed.remaining.length > 0) {
            console.warn('Invalid bass note:', bassNoteName);
            return '';
        }
        encodedChord += `/${bassNoteParsed.encodedNote}`;
    }

    return encodedChord;
};

export const decodeChordName = (encoded: string, codeToType: Record<string, string>): string => {
    let encodedBassNote: string | undefined;
    let encodedMainChord = encoded;

    const slashIndex = encoded.lastIndexOf('/');
    if (slashIndex > 0 && slashIndex < encoded.length - 1) {
        const potentialBassNote = encoded.substring(slashIndex + 1);
        
        // Check if it looks like an encoded bass note
        // Valid encoded note format: 1-2 characters
        // - First char: any single character (pitch code)
        // - Optional second char: S/F/s/f (accidental)
        const isValidEncodedNote = potentialBassNote.length >= 1 && 
                                    potentialBassNote.length <= 2 &&
                                    (potentialBassNote.length === 1 || 
                                     ['S', 'F', 's', 'f'].includes(potentialBassNote[1]));
        
        if (isValidEncodedNote) {
            encodedMainChord = encoded.substring(0, slashIndex);
            encodedBassNote = potentialBassNote;
        }
        // Otherwise, the slash is part of the chord type encoding
    }

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
        return mainNote;
    }

    let decodedChord = mainNote + chordType;

    if (encodedBassNote) {
        const bassNote = decodeNote(encodedBassNote);
        if (!bassNote) {
            console.warn('Failed to decode bass note:', encodedBassNote);
        } else {
            decodedChord += `/${bassNote}`;
        }
    }

    return decodedChord;
};

// ============================================================================
// TIMING ENCODING/DECODING
// ============================================================================

export const encodeTiming = (
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

    return `${bpmEncoded}-${sub}-${swingEncoded}-${f}`;
};

export const decodeTiming = (encoded: string): TimingData => {
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
// PIANO SETTINGS ENCODING/DECODING
// ============================================================================

export const encodePianoSettings = (
    settings: PianoSettings,
    availableInstruments: string[]
): string => {
    const parts: string[] = [];

    const instIndex = availableInstruments.indexOf(settings.instrumentName);
    parts.push(toBase36(Math.max(0, instIndex)));

    const cutOff = settings.cutOffPreviousNotes !== DEFAULTS.CUT_OFF
        ? (settings.cutOffPreviousNotes ? '1' : '0')
        : '';
    parts.push(cutOff);

    const hasEQ = settings.eq.bass !== 0 || settings.eq.mid !== 0 || settings.eq.treble !== 0;
    const eq = hasEQ
        ? toBase36(settings.eq.bass + LIMITS.EQ_OFFSET) +
          toBase36(settings.eq.mid + LIMITS.EQ_OFFSET) +
          toBase36(settings.eq.treble + LIMITS.EQ_OFFSET)
        : '';
    parts.push(eq);

    const octave = settings.octaveOffset !== DEFAULTS.OCTAVE_OFFSET
        ? toBase36(settings.octaveOffset + LIMITS.OCTAVE_OFFSET)
        : '';
    parts.push(octave);

    const duration = Math.abs(settings.noteDuration - DEFAULTS.NOTE_DURATION) > 0.01
        ? toBase36(Math.max(0, Math.round(settings.noteDuration * 10) - 1))
        : '';
    parts.push(duration);

    const volume = Math.abs(settings.volume - DEFAULTS.VOLUME) > 0.01
        ? toBase36(Math.round(settings.volume * LIMITS.EFFECT_SCALE))
        : '';
    parts.push(volume);

    let effectMask = 0;
    const effectValues: string[] = [];

    EFFECTS.forEach((effect, index) => {
        const value = settings[effect.key] as number;
        if (value > 0.01) {
            effectMask |= (1 << index);
            effectValues.push(toBase36(Math.round(value * LIMITS.EFFECT_SCALE)));
        }
    });

    if (effectMask > 0) {
        parts.push(toBase36(effectMask));
        parts.push(effectValues.join(''));
    } else {
        parts.push('');
        parts.push('');
    }

    while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop();
    }

    return parts.join('-');
};

export const decodePianoSettings = (
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

    const parts = encoded.split(/[-|]/);

    if (parts[0]) {
        settings.instrumentName = availableInstruments[fromBase36(parts[0])] ||
            availableInstruments[0] || 'electric_piano_1';
    }

    if (version === VERSION) {
        if (parts[1]) {
            settings.cutOffPreviousNotes = parts[1] === '1';
        }

        if (parts[2] && parts[2].length >= 3) {
            settings.eq.bass = fromBase36(parts[2][0]) - LIMITS.EQ_OFFSET;
            settings.eq.mid = fromBase36(parts[2][1]) - LIMITS.EQ_OFFSET;
            settings.eq.treble = fromBase36(parts[2][2]) - LIMITS.EQ_OFFSET;
        }

        if (parts[3]) {
            settings.octaveOffset = fromBase36(parts[3]) - LIMITS.OCTAVE_OFFSET;
        }

        if (parts[4]) {
            settings.noteDuration = (fromBase36(parts[4]) + 1) / 10;
        }

        if (parts[5]) {
            settings.volume = fromBase36(parts[5]) / LIMITS.EFFECT_SCALE;
        }

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
        // Legacy v7/v8 format
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
// PATTERN UTILITIES
// ============================================================================

export const normalizePattern = (pattern: string[]): string =>
    pattern.map(step => step.replace(/[xX]/gi, '0')).join('.');

// ============================================================================
// CHORD NAME PARSING
// ============================================================================

export function parseChordNameForGeneration(chordName: string): { 
    rootNote: string; 
    chordType: string 
} {
    let mainChord = chordName;
    
    const slashIndex = chordName.lastIndexOf('/');
    if (slashIndex > 0) {
        const potentialBassNote = chordName.substring(slashIndex + 1);
        
        // Only treat it as a slash chord if what follows is a valid bass note
        if (/^[A-G](?:##|#|bb|b)?$/.test(potentialBassNote)) {
            mainChord = chordName.substring(0, slashIndex);
        }
        // Otherwise, the slash is part of the chord type
    }

    const match = mainChord.match(/^([A-G](?:##|bb|#|b)?)(.*)$/);

    if (!match) {
        throw new Error(`Cannot parse chord name: ${chordName}`);
    }

    return { 
        rootNote: match[1], 
        chordType: match[2] 
    };
}