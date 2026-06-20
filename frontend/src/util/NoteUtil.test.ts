import { describe, it, expect } from 'vitest';
import {
  normalizeNoteName,
  normalizeNoteWithOctave,
  convertToStandardNoteName,
  noteNameToNumber,
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
