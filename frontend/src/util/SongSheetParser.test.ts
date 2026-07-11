import { describe, expect, it } from 'vitest';
import {
    chordAtOffset,
    chordSpansInSource,
    detectFormat,
    normalizeToChordPro,
    parseSong,
    songToText,
    insertChordInSource,
    replaceChordInSource,
    removeChordFromSource,
} from './SongSheetParser';

const STAND_BY_ME = [
    'C              G',
    'When the night has come',
    'Am                 F',
    'And the land is dark',
].join('\n');

describe('detectFormat', () => {
    it('detects inline bracket chords as chordpro', () => {
        expect(detectFormat('Hello [Am]darkness my old [F]friend')).toBe('chordpro');
    });

    it('detects chord lines above lyrics', () => {
        expect(detectFormat(STAND_BY_ME)).toBe('chords-over-lyrics');
    });

    it('treats bare lyrics as plain', () => {
        expect(detectFormat('Hello darkness my old friend\nI have come to talk')).toBe('plain');
    });

    it('does not read section labels or annotations in brackets as chords', () => {
        expect(detectFormat('[Chorus]\nSo darling darling')).toBe('plain');
        expect(detectFormat('la la la [Repeat] la')).toBe('plain');
    });
});

describe('normalizeToChordPro', () => {
    it('merges a chord line into the lyric line below at chord columns', () => {
        expect(normalizeToChordPro(STAND_BY_ME)).toBe(
            '[C]When the night [G]has come\n[Am]And the land is dar[F]k'
        );
    });

    it('appends chords that sit past the end of the lyric line', () => {
        const sheet = 'C        G\nSo short';
        expect(normalizeToChordPro(sheet)).toBe('[C]So short [G]');
    });

    it('brackets chords in place on instrumental lines with no lyric below', () => {
        expect(normalizeToChordPro('Am F C G\n\nHello darkness')).toBe(
            '[Am] [F] [C] [G]\n\nHello darkness'
        );
        expect(normalizeToChordPro('Am F x2')).toBe('[Am] [F] x2');
    });

    it('handles two stacked chord lines', () => {
        expect(normalizeToChordPro('Am F\nC G\nHello darkness my friend')).toBe(
            '[Am] [F]\n[C]He[G]llo darkness my friend'
        );
    });

    it('keeps unicode accidentals as typed', () => {
        expect(normalizeToChordPro('B♭m7 F♯\nHello darkness my friend')).toBe(
            '[B♭m7]Hello[F♯] darkness my friend'
        );
    });

    it('is idempotent on chordpro and plain input', () => {
        const chordpro = 'Hello [Am]darkness my old [F]friend\n\n[Chorus]\nla la la';
        expect(normalizeToChordPro(chordpro)).toBe(chordpro);
        const normalized = normalizeToChordPro(STAND_BY_ME);
        expect(normalizeToChordPro(normalized)).toBe(normalized);
    });

    it('does not mistake short prose for a chord line', () => {
        const text = 'I am the walrus\ngoo goo';
        expect(normalizeToChordPro(text)).toBe(text);
    });

    it('handles CRLF input', () => {
        expect(normalizeToChordPro('C  G\r\nWhen the night')).toBe('[C]Whe[G]n the night');
    });
});

describe('parseSong', () => {
    it('attaches each chord to the following word', () => {
        const song = parseSong('Hello [Am]darkness my old [F]friend');
        expect(song.lines).toHaveLength(1);
        const tokens = song.lines[0].tokens;
        expect(tokens.map(t => t.text)).toEqual(['Hello', 'darkness', 'my', 'old', 'friend']);
        expect(tokens[0].chord).toBeNull();
        expect(tokens[1].chord?.name).toBe('Am');
        expect(tokens[4].chord?.name).toBe('F');
        expect(song.chordSequence.map(c => c.name)).toEqual(['Am', 'F']);
        expect(song.chordSequence.map(c => c.seqIndex)).toEqual([0, 1]);
    });

    it('reports source offsets that slice back to the original text', () => {
        const source = 'Hello [Am]darkness\n[F]and more';
        const song = parseSong(source);
        for (const line of song.lines) {
            for (const token of line.tokens) {
                expect(source.slice(token.sourceStart, token.sourceEnd)).toBe(token.text);
                if (token.chord) {
                    expect(source.slice(token.chord.sourceStart, token.chord.sourceEnd))
                        .toBe(`[${token.chord.raw}]`);
                }
            }
        }
    });

    it('keeps offsets correct across CRLF line endings', () => {
        const source = 'Hello [Am]darkness\r\n[F]and more';
        const song = parseSong(source);
        const f = song.chordSequence[1];
        expect(source.slice(f.sourceStart, f.sourceEnd)).toBe('[F]');
    });

    it('creates chord-only slots for markers with no lyric after them', () => {
        const song = parseSong('So short [G]\n[Am] [F]');
        const firstLine = song.lines[0].tokens;
        expect(firstLine[firstLine.length - 1]).toMatchObject({ text: '', chord: expect.anything() });
        expect(firstLine[firstLine.length - 1].chord?.name).toBe('G');
        const secondLine = song.lines[1].tokens;
        expect(secondLine.map(t => t.text)).toEqual(['', '']);
        expect(secondLine.map(t => t.chord?.name)).toEqual(['Am', 'F']);
    });

    it('recognizes section headers but not inline chords as sections', () => {
        const song = parseSong('[Verse 2]\n[Am]Hello\nChorus:\nPre-Chorus');
        expect(song.lines.map(l => l.kind)).toEqual(['section', 'lyrics', 'section', 'section']);
        expect(song.lines[0].label).toBe('Verse 2');
        expect(song.lines[2].label).toBe('Chorus');
    });

    it('does not read lyric lines starting with a section word as sections', () => {
        const song = parseSong('Tag you are it');
        expect(song.lines[0].kind).toBe('lyrics');
    });

    it('keeps non-chord bracket text as literal lyrics', () => {
        const song = parseSong('la la [Repeat] la [x2]');
        expect(song.chordSequence).toHaveLength(0);
        expect(song.lines[0].tokens.map(t => t.text)).toEqual(['la', 'la', '[Repeat]', 'la', '[x2]']);
    });

    it('still resolves typo\'d chords in brackets to a near match', () => {
        const song = parseSong('[Amn7]Hello');
        expect(song.chordSequence).toHaveLength(1);
        expect(song.chordSequence[0].parsed.matchType).toBe('nearest');
    });

    it('classifies empty and whitespace lines', () => {
        const song = parseSong('[Am]Hi\n\n   \nBye');
        expect(song.lines.map(l => l.kind)).toEqual(['lyrics', 'empty', 'empty', 'lyrics']);
    });
});

describe('songToText', () => {
    it('places chord names at the column of their word', () => {
        const text = songToText(parseSong('[C]When the night has [G]come'));
        expect(text).toBe('C                  G\nWhen the night has come');
    });

    it('pushes colliding chords to the right', () => {
        const text = songToText(parseSong('[Am]Hi [Fmaj7]my [G]friend'));
        const [chordRow, lyricRow] = text.split('\n');
        expect(lyricRow).toBe('Hi my friend');
        expect(chordRow.split(/\s+/).filter(Boolean)).toEqual(['Am', 'Fmaj7', 'G']);
        expect(chordRow.indexOf('Am')).toBe(0);
        expect(chordRow.indexOf('Fmaj7')).toBeGreaterThan(chordRow.indexOf('Am') + 1);
    });

    it('renders sections, empty lines and chord-only lines', () => {
        const text = songToText(parseSong('[Chorus]\n\n[Am] [F]'));
        expect(text).toBe('[Chorus]\n\nAm F');
    });

    it('strips spaces inside chord names so they stay one token', () => {
        const text = songToText(parseSong('[Cmadd(9)]Hello'));
        expect(text.split('\n')[0].trim()).toBe('Cmadd(9)');
    });

    it('is stable under re-import round trips', () => {
        const once = songToText(parseSong(normalizeToChordPro(STAND_BY_ME)));
        const twice = songToText(parseSong(normalizeToChordPro(once)));
        expect(twice).toBe(once);
    });
});

describe('source splicing helpers', () => {
    it('inserts a chord before a word', () => {
        const source = 'Hello darkness';
        const song = parseSong(source);
        const word = song.lines[0].tokens[1];
        expect(insertChordInSource(source, word.sourceStart, 'Am')).toBe('Hello [Am]darkness');
    });

    it('strips spaces from inserted chord names', () => {
        expect(insertChordInSource('Hello', 0, 'Cm add(9)')).toBe('[Cmadd(9)]Hello');
    });

    it('replaces an existing chord', () => {
        const source = 'Hello [Am]darkness';
        const chord = parseSong(source).chordSequence[0];
        expect(replaceChordInSource(source, chord, 'F#m7')).toBe('Hello [F#m7]darkness');
    });

    it('removes a chord and collapses leftover double spaces', () => {
        const attached = 'Hello [Am]darkness';
        expect(removeChordFromSource(attached, parseSong(attached).chordSequence[0]))
            .toBe('Hello darkness');
        const standalone = 'word [Am] next';
        expect(removeChordFromSource(standalone, parseSong(standalone).chordSequence[0]))
            .toBe('word next');
        const atEnd = 'word [Am]';
        expect(removeChordFromSource(atEnd, parseSong(atEnd).chordSequence[0])).toBe('word');
    });
});

describe('chordAtOffset', () => {
    it('finds an inline marker under the caret', () => {
        const source = 'Hello [Am]darkness my old [F]friend';
        const inside = source.indexOf('Am') + 1;
        const chord = chordAtOffset(source, inside);
        expect(chord?.raw).toBe('Am');
        expect(chord?.sourceStart).toBe(source.indexOf('[Am]'));
        expect(chord?.sourceEnd).toBe(source.indexOf('[Am]') + 4);
    });

    it('returns null on lyric text between markers', () => {
        const source = 'Hello [Am]darkness my old [F]friend';
        expect(chordAtOffset(source, source.indexOf('darkness') + 2)).toBeNull();
        expect(chordAtOffset(source, 0)).toBeNull();
    });

    it('returns null for bracketed text that is not a chord', () => {
        expect(chordAtOffset('[Chorus]', 3)).toBeNull();
        expect(chordAtOffset('la la [Repeat] la', 9)).toBeNull();
    });

    it('finds a chord word on a chords-over-lyrics chord line', () => {
        const source = STAND_BY_ME; // 'C              G\nWhen the night...'
        const chord = chordAtOffset(source, source.indexOf('G'));
        expect(chord?.raw).toBe('G');
        const lyricLine = source.indexOf('When');
        expect(chordAtOffset(source, lyricLine + 2)).toBeNull();
    });

    it('does not treat lyric words as chords on ordinary lines', () => {
        // "A" alone in a lyric sentence is chord-shaped but its line isn't a chord line
        expect(chordAtOffset('Give me A break here', 8)).toBeNull();
    });

    it('handles out-of-range offsets', () => {
        expect(chordAtOffset('[Am]', -1)).toBeNull();
        expect(chordAtOffset('[Am]', 99)).toBeNull();
    });
});

describe('chordSpansInSource', () => {
    it('spans inline markers including their brackets', () => {
        const source = 'Hello [Am]darkness my old [F]friend';
        expect(chordSpansInSource(source)).toEqual([
            { start: 6, end: 10 },
            { start: 26, end: 29 },
        ]);
    });

    it('spans bare chord words on chord lines but nothing on lyric lines', () => {
        const spans = chordSpansInSource(STAND_BY_ME);
        expect(spans.map(s => STAND_BY_ME.slice(s.start, s.end))).toEqual(['C', 'G', 'Am', 'F']);
    });

    it('skips section labels and non-chord brackets', () => {
        expect(chordSpansInSource('[Chorus]\nla la [Repeat] la')).toEqual([]);
    });
});
