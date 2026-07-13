import { describe, it, expect } from 'vitest';
import { getMidiNotes } from './ChordUtil';

describe('getMidiNotes', () => {
    it('keeps an ascending triad in the starting octave', () => {
        expect(getMidiNotes(3, 7, 'C, E, G')).toEqual([
            { note: 'C', octave: 3 },
            { note: 'E', octave: 3 },
            { note: 'G', octave: 3 },
        ]);
    });

    it('bumps the octave when a note letter wraps below the previous one', () => {
        // G -> C descends in letter order, so C lands an octave up.
        expect(getMidiNotes(3, 7, 'G, C, E')).toEqual([
            { note: 'G', octave: 3 },
            { note: 'C', octave: 4 },
            { note: 'E', octave: 4 },
        ]);
    });

    it('normalizes flat spellings before computing octaves', () => {
        const notes = getMidiNotes(4, 7, 'Bb, D, F');
        expect(notes[0].note).toBe('A#');
        // A# (letter A) then D is a lower letter, so D crosses into the next octave.
        expect(notes).toEqual([
            { note: 'A#', octave: 4 },
            { note: 'D', octave: 5 },
            { note: 'F', octave: 5 },
        ]);
    });

    it('never exceeds the end octave', () => {
        const notes = getMidiNotes(7, 7, 'G, C, E');
        expect(notes.every(n => n.octave <= 7)).toBe(true);
        expect(notes).toEqual([
            { note: 'G', octave: 7 },
            { note: 'C', octave: 7 },
            { note: 'E', octave: 7 },
        ]);
    });

    it('handles a single-note chord', () => {
        expect(getMidiNotes(2, 7, 'C')).toEqual([{ note: 'C', octave: 2 }]);
    });
});
