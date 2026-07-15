import { describe, it, expect } from 'vitest';
import {
    calculateTransposeSteps,
    transposeChordName,
    transposeNotes,
} from './useChordTranspose';

describe('calculateTransposeSteps', () => {
    it('returns 0 for the same key', () => {
        expect(calculateTransposeSteps('C', 'C')).toBe(0);
    });

    it('measures the shortest signed path between keys', () => {
        expect(calculateTransposeSteps('C', 'D')).toBe(2);
        // C -> G is +7 up, but the shortest path is -5 (down a fourth)
        expect(calculateTransposeSteps('C', 'G')).toBe(-5);
        expect(calculateTransposeSteps('C', 'F')).toBe(5);
    });

    it('normalizes flat keys to their sharp equivalents', () => {
        expect(calculateTransposeSteps('C', 'Eb')).toBe(3);
        expect(calculateTransposeSteps('Bb', 'C')).toBe(2);
    });

    it('returns 0 for an unrecognized key', () => {
        expect(calculateTransposeSteps('C', 'H')).toBe(0);
    });
});

describe('transposeChordName', () => {
    it('transposes a natural root and preserves the suffix', () => {
        expect(transposeChordName('Cmaj7', 2)).toBe('Dmaj7');
        expect(transposeChordName('Am', 3)).toBe('Cm');
    });

    it('handles single accidentals in the root', () => {
        expect(transposeChordName('C#m', 2)).toBe('D#m');
        expect(transposeChordName('Bb7', 1)).toBe('B7');
    });

    it('handles double accidentals in the root', () => {
        // Bbb is enharmonically A (9); +2 -> B
        expect(transposeChordName('Bbb7', 2)).toBe('B7');
    });

    it('wraps around the octave and returns sharp spellings', () => {
        expect(transposeChordName('A', 3)).toBe('C');
        expect(transposeChordName('G', 6)).toBe('C#');
    });

    it('returns the input untouched when empty', () => {
        expect(transposeChordName('', 5)).toBe('');
    });
});

describe('transposeNotes', () => {
    it('transposes a comma-separated note list', () => {
        expect(transposeNotes('C, E, G', 2)).toBe('D, F#, A');
    });

    it('accepts space-separated notes and normalizes the delimiter', () => {
        expect(transposeNotes('C E G', 2)).toBe('D, F#, A');
    });

    it('ignores extra whitespace and empty entries', () => {
        expect(transposeNotes('C,  , E', 0)).toBe('C, E');
    });

    it('is a round trip when transposing up then down by the same amount', () => {
        const once = transposeNotes('C, E, G, Bb', 5);
        expect(transposeNotes(once, -5)).toBe('C, E, G, A#');
    });
});
