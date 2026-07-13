import { describe, it, expect, vi, afterEach } from 'vitest';
import { convertScaleToMajorKey } from './KeySignatureUtil';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('convertScaleToMajorKey', () => {
    it('returns C Major for a scale with no accidentals', () => {
        expect(convertScaleToMajorKey(['C', 'D', 'E', 'F', 'G', 'A', 'B'])).toBe('C Major');
    });

    it('maps sharp counts to the matching major key', () => {
        expect(convertScaleToMajorKey(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])).toBe('G Major');
        expect(convertScaleToMajorKey(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])).toBe('D Major');
        expect(convertScaleToMajorKey(['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'])).toBe('A Major');
        expect(convertScaleToMajorKey(['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'])).toBe('E Major');
        expect(convertScaleToMajorKey(['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'])).toBe('B Major');
        expect(convertScaleToMajorKey(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])).toBe('F# Major');
        expect(convertScaleToMajorKey(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'])).toBe('C# Major');
    });

    it('maps flat counts to the matching major key', () => {
        expect(convertScaleToMajorKey(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'])).toBe('F Major');
        expect(convertScaleToMajorKey(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])).toBe('Bb Major');
        expect(convertScaleToMajorKey(['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'])).toBe('Eb Major');
        expect(convertScaleToMajorKey(['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'])).toBe('Ab Major');
        expect(convertScaleToMajorKey(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])).toBe('Db Major');
        expect(convertScaleToMajorKey(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'])).toBe('Gb Major');
        expect(convertScaleToMajorKey(['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'])).toBe('Cb Major');
    });

    it('counts a double sharp as two sharps', () => {
        // one double sharp -> weight 2 -> D Major
        expect(convertScaleToMajorKey(['C##'])).toBe('D Major');
    });

    it('counts a double flat as two flats', () => {
        // one double flat -> weight 2 -> Bb Major
        expect(convertScaleToMajorKey(['Cbb'])).toBe('Bb Major');
    });

    it('returns null and logs when there is no standard major equivalent', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        // eight sharps has no case in the switch
        const eightSharps = ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#', 'C#'];
        expect(convertScaleToMajorKey(eightSharps)).toBeNull();
        expect(err).toHaveBeenCalled();
    });
});
