/**
 * Song Sheet Parser
 * Turns free-form lyric documents into a structured, chord-aware song sheet.
 * The persisted form of a song is a single ChordPro-style source string with
 * inline [Am] markers; this module converts pasted chords-over-lyrics text
 * into that form, parses the source into renderable lines/tokens with source
 * offsets (so chords can be placed/edited by splicing the source), and
 * serializes a parsed song back to aligned chords-over-lyrics plain text.
 */

import {
    ParsedChordToken,
    analyzeChordWord,
    parseChordToken,
    resolvedChordName,
} from './ProgressionParser';

export type SongFormat = 'chordpro' | 'chords-over-lyrics' | 'plain';

export interface SheetChord {
    raw: string;              // marker text as typed (without brackets)
    parsed: ParsedChordToken;
    name: string;             // display name with the resolved chord type
    sourceStart: number;      // offset of '[' in the song source
    sourceEnd: number;        // offset just past ']'
    seqIndex: number;         // position in the song's flat chord sequence
}

export interface SheetToken {
    text: string;             // lyric word ('' for a chord with no lyric under it)
    sourceStart: number;      // offsets of the lyric text in the song source
    sourceEnd: number;
    chord: SheetChord | null;
}

export interface SheetLine {
    kind: 'lyrics' | 'section' | 'empty';
    label?: string;           // section name, e.g. "Chorus 2"
    tokens: SheetToken[];
    sourceStart: number;
    sourceEnd: number;
}

export interface ParsedSong {
    lines: SheetLine[];
    chordSequence: SheetChord[];
}

// Section headers on their own line: "Chorus", "[Verse 2]", "Intro:", "(Bridge) x2".
// The trailing part is kept strict so lyric lines that merely start with one of
// these words ("Tag you're it") don't turn into section headers.
const SECTION_LINE_REGEX =
    /^\s*[[(]?\s*(verse|chorus|bridge|intro|outro|pre[-\s]?chorus|solo|tag|interlude|instrumental|refrain|coda|ending|hook)(\s*\d+)?\s*[\])]?\s*:?(?:\s*[x×]\s*\d+\s*)?$/i;

// Words that must never be read as chords inside [brackets] even though they
// start with a note letter ("Chorus" -> C, "Coda" -> C, "Bridge" -> B ...).
const SECTION_WORD_REGEX =
    /^(verse|chorus|bridge|intro|outro|pre[-\s]?chorus|solo|tag|interlude|instrumental|refrain|coda|ending|hook)\b/i;

/**
 * Decide whether bracket content is a chord. Confident matches (exact/alias)
 * always count; fuzzy near-matches only count when they look like a chord
 * symbol (single word, short suffix) rather than a bracketed lyric annotation
 * like "[Repeat]" — those stay literal text.
 */
function parseChordMarker(content: string): ParsedChordToken | null {
    const trimmed = content.trim();
    if (!trimmed || SECTION_WORD_REGEX.test(trimmed)) return null;
    const parsed = parseChordToken(trimmed);
    if (!parsed.root) return null;
    if (parsed.matchType === 'exact' || parsed.matchType === 'alias') return parsed;
    if (!/\s/.test(trimmed) && parsed.requestedSuffix.length <= 3) return parsed;
    return null;
}

interface LineWord {
    text: string;
    col: number;              // character column within the line
    isChordShaped: boolean;   // has a readable root (typos still count)
    confident: boolean;       // suffix resolved exactly or via alias
}

function lineWords(line: string): LineWord[] {
    const words: LineWord[] = [];
    const re = /[^\s,;|]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
        const { root, confident } = analyzeChordWord(m[0]);
        words.push({ text: m[0], col: m.index, isChordShaped: root !== null, confident });
    }
    return words;
}

// Same rule as ProgressionParser.tokenizeProgression: confident chords make up
// at least half the words, and either several of them or nothing but chords.
// Lines already carrying [markers] are never chord lines.
function isChordLine(words: LineWord[]): boolean {
    if (!words.length || words.some(w => w.text.includes('['))) return false;
    const confident = words.filter(w => w.confident).length;
    return (
        confident >= 1 &&
        confident / words.length >= 0.5 &&
        (confident >= 2 || confident === words.length)
    );
}

/** Detect how a pasted document expresses its chords, if at all. */
export function detectFormat(input: string): SongFormat {
    const markerRe = /\[([^[\]\n]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = markerRe.exec(input))) {
        if (parseChordMarker(m[1])) return 'chordpro';
    }
    for (const line of input.split(/\r?\n/)) {
        if (isChordLine(lineWords(line))) return 'chords-over-lyrics';
    }
    return 'plain';
}

/**
 * Convert chords-over-lyrics text into inline ChordPro-style markers: each
 * chord on a chord line is inserted as [Chord] into the following lyric line
 * at its character column (chords past the end of the lyric are appended).
 * Chord lines with no lyric line under them (intros, instrumentals) keep
 * their layout with each chord bracketed in place. Lines that are already
 * ChordPro or plain lyrics pass through unchanged, so this is idempotent.
 */
export function normalizeToChordPro(input: string): string {
    const lines = input.split(/\r?\n/);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const words = lineWords(line);
        if (!isChordLine(words)) {
            out.push(line);
            continue;
        }

        // Right-to-left so earlier splice offsets stay valid.
        const chordWords = words.filter(w => w.isChordShaped);
        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const nextIsLyric =
            next !== null && next.trim().length > 0 && !isChordLine(lineWords(next));

        if (nextIsLyric) {
            let lyric = next!;
            const trailing: string[] = [];
            for (let j = chordWords.length - 1; j >= 0; j--) {
                const w = chordWords[j];
                if (w.col >= lyric.length) {
                    trailing.unshift(`[${w.text}]`);
                } else {
                    lyric = lyric.slice(0, w.col) + `[${w.text}]` + lyric.slice(w.col);
                }
            }
            if (trailing.length) lyric = `${lyric} ${trailing.join(' ')}`;
            out.push(lyric);
            i++; // the lyric line was consumed
        } else {
            let rebuilt = line;
            for (let j = chordWords.length - 1; j >= 0; j--) {
                const w = chordWords[j];
                rebuilt =
                    rebuilt.slice(0, w.col) +
                    `[${w.text}]` +
                    rebuilt.slice(w.col + w.text.length);
            }
            out.push(rebuilt);
        }
    }
    return out.join('\n');
}

/**
 * Parse a ChordPro-style source string into renderable lines. Every token and
 * chord carries its source offsets so edits are plain string splices. A chord
 * marker attaches to the next word on its line; markers followed by another
 * marker or the line end become chord-only slots. Bracket text that isn't a
 * chord stays visible as literal lyric text.
 */
export function parseSong(source: string): ParsedSong {
    const lines: SheetLine[] = [];
    const chordSequence: SheetChord[] = [];
    let offset = 0;

    for (const raw of source.split('\n')) {
        const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
        const lineStart = offset;
        const lineEnd = offset + text.length;
        offset += raw.length + 1;

        if (!text.trim()) {
            lines.push({ kind: 'empty', tokens: [], sourceStart: lineStart, sourceEnd: lineEnd });
            continue;
        }

        const section = text.match(SECTION_LINE_REGEX);
        if (section) {
            const label = section[1] + (section[2] ? ` ${section[2].trim()}` : '');
            lines.push({ kind: 'section', label, tokens: [], sourceStart: lineStart, sourceEnd: lineEnd });
            continue;
        }

        const tokens: SheetToken[] = [];
        let pending: SheetChord | null = null;

        const pushWords = (segStart: number, segEnd: number) => {
            const seg = text.slice(segStart, segEnd);
            const re = /\S+/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(seg))) {
                tokens.push({
                    text: m[0],
                    sourceStart: lineStart + segStart + m.index,
                    sourceEnd: lineStart + segStart + m.index + m[0].length,
                    chord: pending,
                });
                pending = null;
            }
        };
        const flushPending = (col: number) => {
            if (!pending) return;
            tokens.push({
                text: '',
                sourceStart: lineStart + col,
                sourceEnd: lineStart + col,
                chord: pending,
            });
            pending = null;
        };

        const markerRe = /\[([^[\]\n]*)\]/g;
        let pos = 0;
        let marker: RegExpExecArray | null;
        while ((marker = markerRe.exec(text))) {
            pushWords(pos, marker.index);
            flushPending(marker.index);

            const parsed = parseChordMarker(marker[1]);
            if (parsed) {
                const chord: SheetChord = {
                    raw: marker[1].trim(),
                    parsed,
                    name: resolvedChordName(parsed),
                    sourceStart: lineStart + marker.index,
                    sourceEnd: lineStart + marker.index + marker[0].length,
                    seqIndex: chordSequence.length,
                };
                chordSequence.push(chord);
                pending = chord;
            } else {
                tokens.push({
                    text: marker[0],
                    sourceStart: lineStart + marker.index,
                    sourceEnd: lineStart + marker.index + marker[0].length,
                    chord: null,
                });
            }
            pos = marker.index + marker[0].length;
        }
        pushWords(pos, text.length);
        flushPending(text.length);

        lines.push({ kind: 'lyrics', tokens, sourceStart: lineStart, sourceEnd: lineEnd });
    }

    return { lines, chordSequence };
}

/**
 * Serialize a parsed song to aligned chords-over-lyrics plain text (the
 * export format). Chord names are placed at the column of the word they sit
 * over; colliding chords are pushed right. Names keep their spaces stripped
 * so each chord stays a single token when re-imported.
 */
export function songToText(parsed: ParsedSong): string {
    const out: string[] = [];
    for (const line of parsed.lines) {
        if (line.kind === 'empty') {
            out.push('');
            continue;
        }
        if (line.kind === 'section') {
            out.push(`[${line.label}]`);
            continue;
        }

        let lyricRow = '';
        let chordRow = '';
        for (const token of line.tokens) {
            if (token.text && lyricRow) lyricRow += ' ';
            if (token.chord) {
                const name = token.chord.name.replace(/\s+/g, '');
                const at = chordRow.length === 0
                    ? lyricRow.length
                    : Math.max(lyricRow.length, chordRow.length + 1);
                chordRow = chordRow.padEnd(at, ' ') + name;
            }
            lyricRow += token.text;
        }

        if (chordRow) out.push(chordRow);
        if (lyricRow) out.push(lyricRow);
    }
    return out.join('\n');
}

interface LineChordHit {
    raw: string;
    parsed: ParsedChordToken;
    start: number;            // column of the marker/word start
    end: number;              // column just past it
    isMarker: boolean;        // bracketed [Am] vs a bare word on a chord line
}

/**
 * Recognizable chords on a single line of raw editor text: inline [Am]
 * markers, or bare chord words when the whole line reads as a chord line.
 */
function lineChords(line: string): LineChordHit[] {
    const hits: LineChordHit[] = [];
    const markerRe = /\[([^[\]\n]*)\]/g;
    let hasMarkers = false;
    let m: RegExpExecArray | null;
    while ((m = markerRe.exec(line))) {
        hasMarkers = true;
        const parsed = parseChordMarker(m[1]);
        if (parsed) {
            hits.push({
                raw: m[1].trim(),
                parsed,
                start: m.index,
                end: m.index + m[0].length,
                isMarker: true,
            });
        }
    }
    if (hasMarkers) return hits; // marker lines are never chord lines

    const words = lineWords(line);
    if (!isChordLine(words)) return [];
    for (const w of words) {
        const parsed = parseChordMarker(w.text);
        if (parsed) {
            hits.push({
                raw: w.text,
                parsed,
                start: w.col,
                end: w.col + w.text.length,
                isMarker: false,
            });
        }
    }
    return hits;
}

/**
 * Find the chord under a caret offset in raw editor text. Returns null when
 * the caret isn't on a chord, so a click there can stay an ordinary caret
 * placement. A caret right after a marker's ']' belongs to the lyric that
 * follows, but bare chord words count their trailing edge (whitespace-bound).
 */
export function chordAtOffset(
    source: string,
    offset: number
): Omit<SheetChord, 'seqIndex'> | null {
    if (offset < 0 || offset > source.length) return null;
    const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
    let lineEnd = source.indexOf('\n', offset);
    if (lineEnd === -1) lineEnd = source.length;
    let line = source.slice(lineStart, lineEnd);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    const col = offset - lineStart;

    for (const hit of lineChords(line)) {
        if (col >= hit.start && (hit.isMarker ? col < hit.end : col <= hit.end)) {
            return {
                raw: hit.raw,
                parsed: hit.parsed,
                name: resolvedChordName(hit.parsed),
                sourceStart: lineStart + hit.start,
                sourceEnd: lineStart + hit.end,
            };
        }
    }
    return null;
}

/**
 * Source spans of every recognizable chord in raw editor text (both formats),
 * in document order — used to highlight chords in the source editor.
 */
export function chordSpansInSource(source: string): { start: number; end: number }[] {
    const spans: { start: number; end: number }[] = [];
    let offset = 0;
    for (const raw of source.split('\n')) {
        const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
        for (const hit of lineChords(line)) {
            spans.push({ start: offset + hit.start, end: offset + hit.end });
        }
        offset += raw.length + 1;
    }
    return spans;
}

/** Insert a chord marker into the source at the given offset. */
export function insertChordInSource(source: string, offset: number, chordName: string): string {
    return source.slice(0, offset) + `[${chordName.replace(/\s+/g, '')}]` + source.slice(offset);
}

/** Replace an existing chord marker with a different chord. */
export function replaceChordInSource(source: string, chord: SheetChord, chordName: string): string {
    return (
        source.slice(0, chord.sourceStart) +
        `[${chordName.replace(/\s+/g, '')}]` +
        source.slice(chord.sourceEnd)
    );
}

/** Remove a chord marker, collapsing the double space it may leave behind. */
export function removeChordFromSource(source: string, chord: SheetChord): string {
    let start = chord.sourceStart;
    const end = chord.sourceEnd;
    if (
        start > 0 && source[start - 1] === ' ' &&
        (end >= source.length || source[end] === ' ' || source[end] === '\n' || source[end] === '\r')
    ) {
        start--; // "word [Am] next" -> "word next", not "word  next"
    }
    return source.slice(0, start) + source.slice(end);
}
