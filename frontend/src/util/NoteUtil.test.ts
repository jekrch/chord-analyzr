import { describe, it, expect } from 'vitest';
import {
  normalizeNoteName,
  normalizeNoteWithOctave,
  convertToStandardNoteName,
  noteNameToNumber,
  transposeNoteName,
  createKeySpeller,
  getMidiNote,
  clearMidiNoteCache,
} from './NoteUtil';

describe('normalizeNoteName', () => {
  it('maps enharmonic equivalents to their standard spelling', () => {
    expect(normalizeNoteName('Bb')).toBe('A#');
    expect(normalizeNoteName('E#')).toBe('F');
    expect(normalizeNoteName('Cb')).toBe('B');
  });

  it('leaves already-standard note names untouched', () => {
    expect(normalizeNoteName('C')).toBe('C');
    expect(normalizeNoteName('F#')).toBe('F#');
  });

  it('returns undefined for empty input', () => {
    expect(normalizeNoteName(undefined)).toBeUndefined();
    expect(normalizeNoteName('')).toBeUndefined();
  });
});

describe('normalizeNoteWithOctave', () => {
  it('normalizes the note while preserving the octave', () => {
    expect(normalizeNoteWithOctave('Bb4')).toBe('A#4');
    expect(normalizeNoteWithOctave('Eb3')).toBe('D#3');
  });

  it('rolls the octave forward for B# -> C', () => {
    expect(normalizeNoteWithOctave('B#3')).toBe('C4');
  });

  it('keeps the octave for Cb -> B', () => {
    expect(normalizeNoteWithOctave('Cb4')).toBe('B4');
  });

  it('passes through notes that need no normalization', () => {
    expect(normalizeNoteWithOctave('C4')).toBe('C4');
  });
});

describe('convertToStandardNoteName', () => {
  it('resolves accidentals to a chromatic note name', () => {
    expect(convertToStandardNoteName('Bb')).toBe('A#');
    expect(convertToStandardNoteName('Cb')).toBe('B');
    expect(convertToStandardNoteName('B#')).toBe('C');
  });

  it('wraps around the octave for double accidentals', () => {
    expect(convertToStandardNoteName('Bbb')).toBe('A');
  });

  it('defaults to C for invalid input', () => {
    expect(convertToStandardNoteName('')).toBe('C');
    expect(convertToStandardNoteName('H')).toBe('C');
  });
});

describe('noteNameToNumber', () => {
  it('returns the chromatic index (0-11)', () => {
    expect(noteNameToNumber('C')).toBe(0);
    expect(noteNameToNumber('A#')).toBe(10);
    expect(noteNameToNumber('Bb')).toBe(10);
  });

  it('ignores octave digits', () => {
    expect(noteNameToNumber('G4')).toBe(7);
  });
});

describe('transposeNoteName', () => {
  it('uses conventional spellings when no preference is given', () => {
    expect(transposeNoteName('C', 2)).toBe('D');
    expect(transposeNoteName('C', 1)).toBe('Db'); // conventional prefers Db
    expect(transposeNoteName('C', 6)).toBe('F#'); // ...but F# over Gb
  });

  it('honors an explicit flat/sharp preference', () => {
    expect(transposeNoteName('C', 1, false)).toBe('C#');
    expect(transposeNoteName('C', 1, true)).toBe('Db');
  });

  it('wraps around the octave', () => {
    expect(transposeNoteName('A', 3)).toBe('C');
    expect(transposeNoteName('C', -1, false)).toBe('B');
  });
});

describe('createKeySpeller', () => {
  it('respells to the scale spelling in a flat key (A# -> Bb)', () => {
    const speller = createKeySpeller(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'Bb');
    expect(speller('A#', 4)).toEqual({ note: 'Bb', octave: 4 });
  });

  it('flattens out-of-scale pitches in a flat key (F# -> Gb)', () => {
    const speller = createKeySpeller(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'Bb');
    expect(speller('F#', 4)).toEqual({ note: 'Gb', octave: 4 });
  });

  it('leaves a note that already matches the scale untouched', () => {
    const speller = createKeySpeller(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'Bb');
    expect(speller('C', 4)).toEqual({ note: 'C', octave: 4 });
  });

  it('adjusts the octave across the B/C boundary (C -> B# drops an octave)', () => {
    const speller = createKeySpeller(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'], 'C#');
    expect(speller('C', 5)).toEqual({ note: 'B#', octave: 4 });
  });

  it('leaves out-of-scale pitches as-is in a sharp key', () => {
    const speller = createKeySpeller(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], 'D');
    expect(speller('A#', 4)).toEqual({ note: 'A#', octave: 4 });
  });
});

describe('getMidiNote', () => {
  it('is an octave (12 semitones) apart between adjacent octaves', () => {
    expect(getMidiNote('C', 5) - getMidiNote('C', 4)).toBe(12);
  });

  it('treats enharmonic spellings as the same pitch', () => {
    expect(getMidiNote('C#', 4)).toBe(getMidiNote('Db', 4));
  });

  it('returns a cached value on the second lookup', () => {
    clearMidiNoteCache();
    const first = getMidiNote('G', 3);
    expect(getMidiNote('G', 3)).toBe(first);
    clearMidiNoteCache(); // does not throw
  });
});
