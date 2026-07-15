/**
 * Integration checks for key/mode inference and chord building against the
 * real static scale data, with fetch stubbed to read from public/data.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseProgression, inferKeyAndMode, buildProgressionChord, buildAddedChordsFromTokens } from './ProgressionParser';

const MODES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Melodic Minor', 'Dorian b2', 'Lydian Augmented', 'Lydian Dominant', 'Mixolydian b6',
    'Locrian #2', 'Altered Scale', 'Minor Blues', 'Major Blues', 'Minor Pentatonic',
    'Major Pentatonic', 'Harmonic Minor', 'Bebop Major', 'Bebop Dominant', 'Bebop Minor'];

beforeAll(() => {
    (globalThis as any).fetch = async (url: string) => {
        const path = resolve(__dirname, '../../public', String(url).replace(/^\//, ''));
        const body = await readFile(path, 'utf-8');
        return {
            ok: true,
            json: async () => JSON.parse(body),
        };
    };
});

describe('inferKeyAndMode (integration)', () => {
    it('C F G -> C Ionian', async () => {
        const result = await inferKeyAndMode(parseProgression('C F G'), MODES);
        expect(result).toMatchObject({ key: 'C', mode: 'Ionian' });
        expect(result!.coverage).toBe(1);
    });

    it('Am F C G -> A Aeolian', async () => {
        const result = await inferKeyAndMode(parseProgression('Am F C G'), MODES);
        expect(result).toMatchObject({ key: 'A', mode: 'Aeolian' });
    });

    it('Dm7 G7 Cmaj7 -> C Ionian', async () => {
        const result = await inferKeyAndMode(parseProgression('Dm7 G7 Cmaj7'), MODES);
        expect(result!.key).toBe('C');
        expect(result!.mode).toBe('Ionian');
    });

    it('C Bb F C -> C Mixolydian', async () => {
        const result = await inferKeyAndMode(parseProgression('C Bb F C'), MODES);
        expect(result).toMatchObject({ key: 'C', mode: 'Mixolydian' });
    });

    it('G D Em C -> G Ionian', async () => {
        const result = await inferKeyAndMode(parseProgression('G D Em C'), MODES);
        expect(result).toMatchObject({ key: 'G', mode: 'Ionian' });
    });

    it('minor ii-V-i resolves to an A minor scale', async () => {
        const result = await inferKeyAndMode(parseProgression('Bm7b5 E7 Am'), MODES);
        expect(result!.key).toBe('A');
        // E7's G# means Harmonic Minor covers it fully; Aeolian is acceptable too
        expect(['Harmonic Minor', 'Aeolian', 'Melodic Minor']).toContain(result!.mode);
    });

    it('flat-leaning progression prefers flat/available key spellings', async () => {
        const result = await inferKeyAndMode(parseProgression('Bbm Eb Ab'), MODES);
        expect(result!.coverage).toBe(1);
        // scale data has no Bb entry, so the enharmonic fallback should kick in
        expect(['A#', 'Bb', 'Ab']).toContain(result!.key);
    });

    it('builds playable notes for a slash chord', async () => {
        const [token] = parseProgression('C/E');
        const built = await buildProgressionChord(token, 'C', 'Ionian');
        expect(built!.name).toBe('C/E');
        expect(built!.notes.split(',').map(n => n.trim())).toEqual(['E', 'C', 'G']);
    });

    it('builds notes for a near-matched chord', async () => {
        const [token] = parseProgression('Cmaj77');
        const built = await buildProgressionChord(token, 'C', 'Ionian');
        expect(built).not.toBeNull();
        expect(built!.notes.length).toBeGreaterThan(0);
    });

    it('returns null for a token with no readable root', async () => {
        const [token] = parseProgression('xyz');
        expect(await buildProgressionChord(token, 'C', 'Ionian')).toBeNull();
    });
});

describe('buildAddedChordsFromTokens (integration)', () => {
    it('generates fresh chords carrying the given pattern and key/mode', async () => {
        const tokens = parseProgression('C F G');
        const built = await buildAddedChordsFromTokens(tokens, 'C', 'Ionian', ['1', '2'], []);
        expect(built.map(c => c.name)).toEqual(['C', 'F', 'G']);
        expect(built[0].pattern).toEqual(['1', '2']);
        expect(built[0]).toMatchObject({ originalKey: 'C', originalMode: 'Ionian' });
    });

    it('reuses an already-loaded chord object instead of regenerating it', async () => {
        const tokens = parseProgression('C F');
        const existing = [{
            name: 'C',
            notes: 'C, E, G',
            pattern: ['x', 'x', 'x'],       // custom pattern that must survive
            originalKey: 'C',
            originalMode: 'Ionian',
            originalNotes: 'C, E, G',
        }];
        const built = await buildAddedChordsFromTokens(tokens, 'C', 'Ionian', ['1', '2'], existing);
        expect(built).toHaveLength(2);
        // reused chord keeps its custom pattern; the fresh one takes the default
        expect(built[0].pattern).toEqual(['x', 'x', 'x']);
        expect(built[1].name).toBe('F');
        expect(built[1].pattern).toEqual(['1', '2']);
    });

    it('skips tokens that cannot be built', async () => {
        const tokens = parseProgression('C xyz G');
        const built = await buildAddedChordsFromTokens(tokens, 'C', 'Ionian', ['1'], []);
        expect(built.map(c => c.name)).toEqual(['C', 'G']);
    });
});
