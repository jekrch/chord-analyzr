import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    noteToPitchClass,
    respellNotesPreservingOrder,
    updateChordNameFromNotes,
} from './stateSerializer';

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    vi.restoreAllMocks();
});

describe('noteToPitchClass', () => {
    it('maps natural notes to their chromatic pitch class', () => {
        expect(noteToPitchClass('C')).toBe(0);
        expect(noteToPitchClass('E')).toBe(4);
        expect(noteToPitchClass('B')).toBe(11);
    });

    it('applies sharps and flats, treating enharmonics as equal', () => {
        expect(noteToPitchClass('C#')).toBe(1);
        expect(noteToPitchClass('Db')).toBe(1);
        expect(noteToPitchClass('C##')).toBe(2);
        expect(noteToPitchClass('Bbb')).toBe(9);
    });

    it('does not read the base letter B as a flat', () => {
        // The accidental scan starts after the first letter, so 'B' stays 11.
        expect(noteToPitchClass('B')).toBe(11);
        expect(noteToPitchClass('Bb')).toBe(10);
    });

    it('ignores the octave number', () => {
        expect(noteToPitchClass('C4')).toBe(0);
        expect(noteToPitchClass('F#3')).toBe(6);
    });

    it('wraps around the octave (Cb -> 11, B# -> 0)', () => {
        expect(noteToPitchClass('Cb')).toBe(11);
        expect(noteToPitchClass('B#')).toBe(0);
    });

    it('returns -1 for unparseable input', () => {
        expect(noteToPitchClass('X')).toBe(-1);
        expect(noteToPitchClass('')).toBe(-1);
    });
});

describe('respellNotesPreservingOrder', () => {
    it('respells each note to the new spelling while keeping order', () => {
        expect(respellNotesPreservingOrder('Db, F, Ab', 'C#, F, G#')).toBe('C#, F, G#');
    });

    it('leaves notes without a matching pitch untouched', () => {
        // Only F (pitch 5) has a new spelling; the others carry through.
        expect(respellNotesPreservingOrder('C, Fb, G', 'F')).toBe('C, Fb, G');
    });

    it('is a no-op when spellings already match', () => {
        expect(respellNotesPreservingOrder('C, E, G', 'C, E, G')).toBe('C, E, G');
    });
});

describe('updateChordNameFromNotes', () => {
    it('respells the root when the regenerated note is enharmonic', () => {
        // C#m regenerated with Db spelling -> Dbm
        expect(updateChordNameFromNotes('C#m', 'Db4, E4, Ab4')).toBe('Dbm');
    });

    it('keeps the original suffix intact', () => {
        expect(updateChordNameFromNotes('Cmaj7', 'C4, E4, G4, B4')).toBe('Cmaj7');
    });

    it('refuses to change a root that is not enharmonic (guards bad data)', () => {
        // 'G' and the regenerated 'C' are different pitches -> keep original.
        expect(updateChordNameFromNotes('G', 'C4, E4, G4')).toBe('G');
    });

    it('respells both root and bass note of a slash chord', () => {
        // Slash chords put the bass note first; index 1 is the root.
        expect(updateChordNameFromNotes('C#/E', 'E4, Db5, Ab5')).toBe('Db/E');
    });

    it('returns the original name when there are too few notes', () => {
        expect(updateChordNameFromNotes('Cmaj7', '')).toBe('Cmaj7');
    });
});
