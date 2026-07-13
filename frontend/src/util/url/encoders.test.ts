import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    toBase36,
    fromBase36,
    generateChordTypeCodes,
    parseNoteFromChordName,
    decodeNote,
    encodeChordNotes,
    decodeChordNotes,
    encodeChordName,
    decodeChordName,
    encodeTiming,
    decodeTiming,
    encodePianoSettings,
    decodePianoSettings,
    normalizePattern,
    parseChordNameForGeneration,
} from './encoders';
import { ChordTypesMap, PianoSettings, DEFAULTS, LIMITS } from './types';

// Quiet the informational console.* the encoders emit so test output stays clean.
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    vi.restoreAllMocks();
});

// A small chord-type map covering the shapes the tests exercise. The empty
// key is the plain major triad and sorts first (see generateChordTypeCodes).
const chordTypes: ChordTypesMap = {
    '': [0, 4, 7],
    'm': [0, 3, 7],
    'm7': [0, 3, 7, 10],
    'maj7': [0, 4, 7, 11],
    'm/Maj7': [0, 3, 7, 11],
};

describe('toBase36 / fromBase36', () => {
    it('round-trips non-negative integers', () => {
        for (const n of [0, 1, 35, 36, 60, 1000]) {
            expect(fromBase36(toBase36(n))).toBe(n);
        }
    });

    it('clamps negatives to zero and rounds fractions', () => {
        expect(toBase36(-5)).toBe('0');
        expect(toBase36(1.6)).toBe('2');
        expect(toBase36(1.2)).toBe('1');
    });

    it('treats empty/garbage input as zero', () => {
        expect(fromBase36('')).toBe(0);
        expect(fromBase36('!!')).toBe(0);
    });
});

describe('generateChordTypeCodes', () => {
    it('assigns the empty (major) type the first code and is reversible', () => {
        const { typeToCode, codeToType } = generateChordTypeCodes(chordTypes);
        expect(typeToCode['']).toBe('0');
        for (const type of Object.keys(chordTypes)) {
            expect(codeToType[typeToCode[type]]).toBe(type);
        }
    });

    it('orders by length then alphabetically after the empty type', () => {
        const { typeToCode } = generateChordTypeCodes(chordTypes);
        // '' (0) < 'm' (len 1) < 'm7' (len 2) < 'm/Maj7'/'maj7' (len 4+)
        expect(typeToCode['']).toBe('0');
        expect(typeToCode['m']).toBe('1');
        expect(typeToCode['m7']).toBe('2');
    });

    it('generates two-character codes past the 62-symbol single set', () => {
        const many: ChordTypesMap = {};
        for (let i = 0; i < 70; i++) many['t' + i.toString().padStart(3, '0')] = [0];
        const { typeToCode, codeToType } = generateChordTypeCodes(many);
        const codes = Object.values(typeToCode);
        expect(new Set(codes).size).toBe(codes.length); // all unique
        for (const [type, code] of Object.entries(typeToCode)) {
            expect(codeToType[code]).toBe(type);
        }
    });
});

describe('parseNoteFromChordName / decodeNote', () => {
    it('parses naturals, sharps, flats and double accidentals', () => {
        expect(parseNoteFromChordName('C')).toEqual({ encodedNote: '0', remaining: '' });
        expect(parseNoteFromChordName('C#m7')).toEqual({ encodedNote: '0s', remaining: 'm7' });
        expect(parseNoteFromChordName('Ebmaj7')).toEqual({ encodedNote: '2f', remaining: 'maj7' });
        expect(parseNoteFromChordName('C##')).toEqual({ encodedNote: '0S', remaining: '' });
        expect(parseNoteFromChordName('Bbb')).toEqual({ encodedNote: '6F', remaining: '' });
    });

    it('rejects unknown roots and mixed accidentals', () => {
        expect(parseNoteFromChordName('Xm')).toBeNull();
        expect(parseNoteFromChordName('C#b')).toBeNull();
    });

    it('round-trips the root note through decodeNote', () => {
        for (const root of ['C', 'C#', 'Db', 'F##', 'Bbb', 'G']) {
            const parsed = parseNoteFromChordName(root)!;
            expect(decodeNote(parsed.encodedNote)).toBe(root);
        }
    });

    it('decodeNote returns empty for an unknown pitch code', () => {
        expect(decodeNote('9')).toBe('');
    });
});

describe('encodeChordNotes / decodeChordNotes', () => {
    it('round-trips a triad of natural notes', () => {
        expect(encodeChordNotes('C, E, G')).toBe('0-4-7');
        expect(decodeChordNotes('0-4-7')).toBe('C, E, G');
    });

    it('encodes enharmonic spellings to the same chromatic index', () => {
        expect(encodeChordNotes('Db')).toBe(encodeChordNotes('C#'));
        // decode always yields the canonical sharp spelling
        expect(decodeChordNotes(encodeChordNotes('Db'))).toBe('C#');
    });

    it('tolerates whitespace and mixed separators when encoding', () => {
        expect(encodeChordNotes('C  E\tG')).toBe('0-4-7');
    });

    it('returns empty string on an unknown note name', () => {
        expect(encodeChordNotes('C, H')).toBe('');
    });

    it('decodeChordNotes ignores empties and out-of-range indices', () => {
        expect(decodeChordNotes('')).toBe('');
        expect(decodeChordNotes('0--7')).toBe('C, G');
    });
});

describe('encodeChordName / decodeChordName', () => {
    const { typeToCode, codeToType } = generateChordTypeCodes(chordTypes);

    it('round-trips basic chords', () => {
        for (const name of ['C', 'C#m7', 'Ebmaj7', 'Am']) {
            const encoded = encodeChordName(name, typeToCode);
            expect(encoded).not.toBe('');
            expect(decodeChordName(encoded, codeToType)).toBe(name);
        }
    });

    it('round-trips slash chords', () => {
        const encoded = encodeChordName('C/E', typeToCode);
        expect(decodeChordName(encoded, codeToType)).toBe('C/E');
    });

    it('keeps a slash that belongs to the chord type (m/Maj7) intact', () => {
        const encoded = encodeChordName('Cm/Maj7', typeToCode);
        expect(encoded).not.toBe('');
        expect(decodeChordName(encoded, codeToType)).toBe('Cm/Maj7');
    });

    it('returns empty string for an unknown chord type', () => {
        expect(encodeChordName('Cdim13', typeToCode)).toBe('');
    });

    it('decodeChordName returns the note alone for an unknown type code', () => {
        // '0.zz' -> note C, but no type registered under 'zz'
        expect(decodeChordName('0.zz', codeToType)).toBe('C');
    });
});

describe('encodeTiming / decodeTiming', () => {
    it('round-trips default timing values', () => {
        const encoded = encodeTiming(DEFAULTS.BPM, DEFAULTS.SUBDIVISION, DEFAULTS.SWING, false, false, false);
        const decoded = decodeTiming(encoded);
        expect(decoded).toEqual({
            bpm: DEFAULTS.BPM,
            subdivision: DEFAULTS.SUBDIVISION,
            swing: DEFAULTS.SWING,
            showPattern: false,
            liveMode: false,
            compactChords: false,
        });
    });

    it('packs and unpacks the boolean flags independently', () => {
        const decoded = decodeTiming(encodeTiming(140, 0.5, 20, true, true, true));
        expect(decoded).toMatchObject({
            bpm: 140,
            subdivision: 0.5,
            swing: 20,
            showPattern: true,
            liveMode: true,
            compactChords: true,
        });
    });

    it('clamps bpm and swing to their limits', () => {
        expect(decodeTiming(encodeTiming(9999, 0.25, 9999, false, false)).bpm).toBe(LIMITS.BPM_MAX);
        expect(decodeTiming(encodeTiming(0, 0.25, 9999, false, false)).bpm).toBe(LIMITS.BPM_MIN);
        expect(decodeTiming(encodeTiming(120, 0.25, 9999, false, false)).swing).toBe(LIMITS.SWING_MAX);
    });

    it('falls back to defaults on empty input', () => {
        const decoded = decodeTiming('');
        expect(decoded.bpm).toBe(DEFAULTS.BPM);
        expect(decoded.subdivision).toBe(DEFAULTS.SUBDIVISION);
    });
});

describe('encodePianoSettings / decodePianoSettings', () => {
    const instruments = ['electric_piano_1', 'acoustic_grand_piano', 'harpsichord'];

    const baseSettings = (): PianoSettings => ({
        instrumentName: 'electric_piano_1',
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
        compressorLevel: 0,
    });

    it('encodes an all-default settings object compactly', () => {
        const encoded = encodePianoSettings(baseSettings(), instruments);
        // instrument index 0 with every other field at its default -> just '0'
        expect(encoded).toBe('0');
    });

    it('round-trips instrument, eq, octave, duration and volume', () => {
        const settings = baseSettings();
        settings.instrumentName = 'harpsichord';
        settings.eq = { bass: 3, mid: -2, treble: 1 };
        settings.octaveOffset = 1;
        settings.noteDuration = 1.2;
        settings.volume = 0.5;

        const decoded = decodePianoSettings(
            encodePianoSettings(settings, instruments), instruments, 'v9'
        );

        expect(decoded.instrumentName).toBe('harpsichord');
        expect(decoded.eq).toEqual({ bass: 3, mid: -2, treble: 1 });
        expect(decoded.octaveOffset).toBe(1);
        expect(decoded.noteDuration).toBeCloseTo(1.2, 5);
        // volume quantizes to 1/EFFECT_SCALE steps, so allow one decimal of slack
        expect(decoded.volume).toBeCloseTo(0.5, 1);
    });

    it('round-trips active effect levels via the effect mask', () => {
        const settings = baseSettings();
        settings.reverbLevel = 0.5;
        settings.delayLevel = 0.2;

        const decoded = decodePianoSettings(
            encodePianoSettings(settings, instruments), instruments, 'v9'
        );

        expect(decoded.reverbLevel).toBeCloseTo(0.5, 1);
        expect(decoded.delayLevel).toBeCloseTo(0.2, 1);
        expect(decoded.chorusLevel).toBe(0);
    });

    it('decodes to sane defaults from an empty string', () => {
        const decoded = decodePianoSettings('', instruments, 'v9');
        expect(decoded.instrumentName).toBe('electric_piano_1');
        expect(decoded.cutOffPreviousNotes).toBe(DEFAULTS.CUT_OFF);
        expect(decoded.octaveOffset).toBe(DEFAULTS.OCTAVE_OFFSET);
    });
});

describe('normalizePattern', () => {
    it('replaces x/X rests with 0 and joins with dots', () => {
        expect(normalizePattern(['1', 'x', '2', 'X'])).toBe('1.0.2.0');
    });
});

describe('parseChordNameForGeneration', () => {
    it('splits root note and chord type', () => {
        expect(parseChordNameForGeneration('C#m7')).toEqual({ rootNote: 'C#', chordType: 'm7' });
        expect(parseChordNameForGeneration('Ebmaj7')).toEqual({ rootNote: 'Eb', chordType: 'maj7' });
        expect(parseChordNameForGeneration('G')).toEqual({ rootNote: 'G', chordType: '' });
    });

    it('drops a real bass note but keeps a type-internal slash', () => {
        expect(parseChordNameForGeneration('C/E')).toEqual({ rootNote: 'C', chordType: '' });
        expect(parseChordNameForGeneration('Cm/Maj7')).toEqual({ rootNote: 'C', chordType: 'm/Maj7' });
    });

    it('throws on an unparseable name', () => {
        expect(() => parseChordNameForGeneration('Xyz')).toThrow();
    });
});
