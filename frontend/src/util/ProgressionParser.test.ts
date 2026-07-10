import { describe, expect, it } from 'vitest';
import {
    tokenizeProgression,
    parseChordToken,
    parseProgression,
    resolvedChordName,
    progressionToString,
    reuseExistingChords,
} from './ProgressionParser';

describe('tokenizeProgression', () => {
    it('splits on spaces, commas, pipes and newlines', () => {
        expect(tokenizeProgression('Am F C G')).toEqual(['Am', 'F', 'C', 'G']);
        expect(tokenizeProgression('Dm7, G7 | Cmaj7\nFmaj7')).toEqual(['Dm7', 'G7', 'Cmaj7', 'Fmaj7']);
        expect(tokenizeProgression('  C  ->  F  ')).toEqual(['C', 'F']);
    });

    it('normalizes unicode accidentals', () => {
        expect(tokenizeProgression('B♭m7 F♯')).toEqual(['Bbm7', 'F#']);
    });

    it('returns empty for blank input', () => {
        expect(tokenizeProgression('')).toEqual([]);
        expect(tokenizeProgression('   ')).toEqual([]);
    });

    it('extracts chords from a chord sheet, ignoring lyric lines', () => {
        const sheet = [
            'C              G',
            'When the night has come',
            'Am                 F',
            'And the land is dark',
        ].join('\n');
        expect(tokenizeProgression(sheet)).toEqual(['C', 'G', 'Am', 'F']);
    });

    it('keeps a lone chord sitting over a lyric line', () => {
        const sheet = 'Em\nHello darkness my old friend';
        expect(tokenizeProgression(sheet)).toEqual(['Em']);
    });

    it('drops non-chord noise on a chord line but keeps the chords', () => {
        expect(tokenizeProgression('Am F N.C. C G x2')).toEqual(['Am', 'F', 'C', 'G']);
    });

    it('does not mistake short prose for a chord line', () => {
        // "I am" is half chords by word count but must not become a chord
        expect(tokenizeProgression('Am F C G\nI am the walrus')).toEqual(['Am', 'F', 'C', 'G']);
    });

    it('falls back to a flat split when no line looks like chords', () => {
        // Lone typo'd chord still parses (no chord-dominant line to filter to)
        expect(tokenizeProgression('Cmaj77')).toEqual(['Cmaj77']);
        expect(tokenizeProgression('X9zz')).toEqual(['X9zz']);
    });
});

describe('parseChordToken', () => {
    it('parses plain major and minor chords exactly', () => {
        const c = parseChordToken('C');
        expect(c.root).toBe('C');
        expect(c.selectedType).toBe('');
        expect(c.matchType).toBe('exact');

        const fsm = parseChordToken('F#m');
        expect(fsm.root).toBe('F#');
        expect(fsm.selectedType).toBe('m');
        expect(fsm.matchType).toBe('exact');
    });

    it('parses complex known chord types exactly', () => {
        expect(parseChordToken('Bbmaj9#11').selectedType).toBe('maj9#11');
        expect(parseChordToken('Am7b5').selectedType).toBe('m7b5');
        expect(parseChordToken('C6/9').selectedType).toBe('6/9');
        expect(parseChordToken('Cm/Maj7').selectedType).toBe('m/Maj7');
    });

    it('resolves common alternate spellings via aliases', () => {
        expect(parseChordToken('CM7').selectedType).toBe('maj7');
        expect(parseChordToken('C-7').selectedType).toBe('m7');
        expect(parseChordToken('Cmin7').selectedType).toBe('m7');
        expect(parseChordToken('C+').selectedType).toBe('aug');
        expect(parseChordToken('C°7').selectedType).toBe('dim7');
        expect(parseChordToken('Cø7').selectedType).toBe('m7b5');
        expect(parseChordToken('Csus').selectedType).toBe('sus4');
        expect(parseChordToken('Cadd9').selectedType).toBe('add(9)');
        expect(parseChordToken('CΔ').selectedType).toBe('maj7');
    });

    it('is case-insensitive where unambiguous', () => {
        expect(parseChordToken('cMAJ7').root).toBe('C');
        expect(parseChordToken('cMAJ7').selectedType).toBe('maj7');
        expect(parseChordToken('ebm7').root).toBe('Eb');
        expect(parseChordToken('ebm7').selectedType).toBe('m7');
    });

    it('maps German H to B', () => {
        const h = parseChordToken('H7');
        expect(h.root).toBe('B');
        expect(h.selectedType).toBe('7');
    });

    it('parses slash chords but not slashes inside type names', () => {
        const slash = parseChordToken('C/E');
        expect(slash.root).toBe('C');
        expect(slash.selectedType).toBe('');
        expect(slash.slash).toBe('E');

        const sixNine = parseChordToken('C6/9');
        expect(sixNine.slash).toBeNull();

        const slashedSeventh = parseChordToken('Am7/G');
        expect(slashedSeventh.selectedType).toBe('m7');
        expect(slashedSeventh.slash).toBe('G');
    });

    it('falls back to ranked near matches for unknown types', () => {
        const near = parseChordToken('Cmaj77');
        expect(near.matchType).toBe('nearest');
        expect(near.selectedType).not.toBeNull();
        expect(near.candidates.length).toBeGreaterThan(1);
        // interval + string similarity should land on a maj7-family chord first
        expect(near.candidates[0].chordType).toContain('maj');
    });

    it('marks unreadable tokens invalid', () => {
        const bad = parseChordToken('X7');
        expect(bad.matchType).toBe('invalid');
        expect(bad.root).toBeNull();
        expect(bad.selectedType).toBeNull();
    });
});

describe('round-trip of loaded progressions', () => {
    it('re-parses chord names that contain spaces after serialization', () => {
        const text = progressionToString(['Cm add(2)', 'F7 add(4)', 'G']);
        const tokens = parseProgression(text);
        expect(tokens).toHaveLength(3);
        expect(tokens[0].root).toBe('C');
        expect(tokens[0].selectedType).toBe('m add(2)');
        expect(tokens[1].selectedType).toBe('7 add(4)');
    });

    it('re-parses slash chord names', () => {
        const tokens = parseProgression(progressionToString(['Cmaj7/E', 'Am']));
        expect(tokens[0].root).toBe('C');
        expect(tokens[0].selectedType).toBe('maj7');
        expect(tokens[0].slash).toBe('E');
    });
});

describe('reuseExistingChords', () => {
    it('keeps loaded chords with custom note order when a different chord is edited', () => {
        // Am carries a custom voicing (reordered notes, no slash in the name)
        const loaded = [
            { name: 'Am', notes: 'E4, A4, C5' },
            { name: 'F', notes: 'F, A, C' },
            { name: 'G', notes: 'G, B, D' },
        ];
        // user changed only the middle chord: F -> Fmaj7
        const tokens = parseProgression('Am Fmaj7 G');
        const reused = reuseExistingChords(tokens, loaded);
        expect(reused[0]).toBe(loaded[0]); // same object, voicing untouched
        expect(reused[1]).toBeNull();      // edited chord regenerates
        expect(reused[2]).toBe(loaded[2]);
    });

    it('consumes duplicated chord names sequentially and at most once', () => {
        const loaded = [
            { name: 'Am', notes: 'A, C, E' },
            { name: 'Am', notes: 'C4, E4, A4' },
        ];
        const tokens = parseProgression('Am Am Am');
        const reused = reuseExistingChords(tokens, loaded);
        expect(reused[0]).toBe(loaded[0]);
        expect(reused[1]).toBe(loaded[1]);
        expect(reused[2]).toBeNull();
    });

    it('matches chord names containing spaces against their serialized tokens', () => {
        const loaded = [{ name: 'Cm add(2)', notes: 'C, D, Eb, G' }];
        const tokens = parseProgression(progressionToString(loaded.map(c => c.name)));
        expect(reuseExistingChords(tokens, loaded)[0]).toBe(loaded[0]);
    });

    it('matches slash chords and retyped aliases of the same chord', () => {
        const loaded = [
            { name: 'Cmaj7/E', notes: 'E, C, G, B' },
            { name: 'Am7', notes: 'A, C, E, G' },
        ];
        // "Amin7" resolves to Am7, so it should still reuse the loaded chord
        const tokens = parseProgression('Cmaj7/E Amin7');
        const reused = reuseExistingChords(tokens, loaded);
        expect(reused[0]).toBe(loaded[0]);
        expect(reused[1]).toBe(loaded[1]);
    });

    it('does not reuse anything for invalid tokens', () => {
        const loaded = [{ name: 'Am', notes: 'A, C, E' }];
        const tokens = parseProgression('X9zz');
        expect(reuseExistingChords(tokens, loaded)).toEqual([null]);
    });
});

describe('resolvedChordName', () => {
    it('renders root, type and slash', () => {
        const token = parseChordToken('Am7/G');
        expect(resolvedChordName(token)).toBe('Am7/G');
        const plain = parseChordToken('Db');
        expect(resolvedChordName(plain)).toBe('Db');
    });
});
