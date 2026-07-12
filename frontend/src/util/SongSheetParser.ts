/**
 * Song Sheet Parser
 * Turns free-form lyric documents into a structured, chord-aware song sheet.
 * The persisted form of a song is a single ChordPro-style source string with
 * inline [Am] markers; this module converts pasted chords-over-lyrics text
 * into that form, parses the source into renderable lines whose chords carry
 * a free-form character column plus source offsets (so chords can be
 * placed/edited by splicing the source), and serializes a parsed song back
 * to aligned chords-over-lyrics plain text.
 *
 * Words on a chord line that don't read as chords become [*annotations]
 * (ChordPro's annotation syntax): they render above the lyrics at their
 * exact column like every other chord, but are inert — never played,
 * transposed, or counted in the chord sequence.
 */

import {
    ParsedChordToken,
    analyzeChordWord,
    parseChordToken,
    resolvedChordName,
} from './ProgressionParser';
import { transposeNoteName } from './NoteUtil';

export type SongFormat = 'chordpro' | 'chords-over-lyrics' | 'plain';

export interface SheetChord {
    raw: string;              // marker text as typed (without brackets, and without the '*' on annotations)
    parsed: ParsedChordToken;
    name: string;             // display name with the resolved chord type (raw text for annotations)
    annotation: boolean;      // a [*text] marker: positional text above the lyrics, not a playable chord
    col: number;              // character column in the line's stripped lyric text
    sourceStart: number;      // offset of '[' in the song source
    sourceEnd: number;        // offset just past ']'
    seqIndex: number;         // position in the song's flat chord sequence (-1 for annotations)
}

export interface SheetLine {
    kind: 'lyrics' | 'section' | 'empty';
    label?: string;           // section name, e.g. "Chorus 2"
    lyricText: string;        // line text with chord markers stripped, spacing intact
    chords: SheetChord[];     // chords on this line, in column order
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

/** Inert parse carried by [*annotation] chords so SheetChord keeps its shape
 * without ever resolving to something playable or transposable. */
function annotationToken(text: string): ParsedChordToken {
    return {
        token: text,
        root: null,
        requestedSuffix: text,
        slash: null,
        matchType: 'invalid',
        selectedType: null,
        candidates: [],
    };
}

/** Marker for a word taken off a chord line: a chord when it reads as one,
 * otherwise a [*annotation] so it still keeps its column above the lyrics. */
function chordLineMarker(text: string): string {
    return parseChordMarker(text) ? `[${text}]` : `[*${text}]`;
}

interface LineWord {
    text: string;
    col: number;              // character column within the line
    confident: boolean;       // suffix resolved exactly or via alias
}

function lineWords(line: string): LineWord[] {
    const words: LineWord[] = [];
    const re = /[^\s,;|]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
        const { confident } = analyzeChordWord(m[0]);
        words.push({ text: m[0], col: m.index, confident });
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
 * Convert chords-over-lyrics text into inline ChordPro-style markers: every
 * word on a chord line is inserted into the following lyric line at its
 * character column (words past the end of the lyric are appended) — as a
 * [Chord] when it reads as one, otherwise as a [*annotation] so unreadable
 * chords and stray tokens ("x2", "N.C.") keep their place above the text.
 * Chord lines with no lyric line under them (intros, instrumentals) keep
 * their layout with each word bracketed in place. Lines that are already
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

        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const nextIsLyric =
            next !== null && next.trim().length > 0 && !isChordLine(lineWords(next));

        if (nextIsLyric) {
            const orig = next!;
            let lyric = orig;
            // Inline words right-to-left so earlier splice offsets stay valid.
            for (let j = words.length - 1; j >= 0; j--) {
                const w = words[j];
                if (w.col >= orig.length) continue;
                lyric = lyric.slice(0, w.col) + chordLineMarker(w.text) + lyric.slice(w.col);
            }
            // Words past the end of the lyric keep their column via padding
            // (markers don't count: they're stripped from the rendered line).
            let strippedLen = orig.length;
            for (const w of words) {
                if (w.col < orig.length) continue;
                const pad = Math.max(w.col, strippedLen + 1) - strippedLen;
                lyric += ' '.repeat(pad) + chordLineMarker(w.text);
                strippedLen += pad;
            }
            out.push(lyric);
            i++; // the lyric line was consumed
        } else {
            // Each word becomes a marker followed by spaces covering its
            // own footprint, so the stripped line keeps every original column.
            let rebuilt = '';
            let pos = 0;
            for (const w of words) {
                rebuilt += line.slice(pos, w.col) + chordLineMarker(w.text) + ' '.repeat(w.text.length);
                pos = w.col + w.text.length;
            }
            rebuilt += line.slice(pos);
            out.push(rebuilt.replace(/\s+$/, ''));
        }
    }
    return out.join('\n');
}

/**
 * Parse a ChordPro-style source string into renderable lines. Chord markers
 * are stripped out of the lyric text; each chord records the character column
 * it occupied in the stripped line, so the view can place it free-form at
 * that exact position above the lyrics — no anchoring to words. Every chord
 * carries its source offsets so edits are plain string splices. [*text]
 * markers become inert annotation chords; other bracket text that isn't a
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
            lines.push({ kind: 'empty', lyricText: '', chords: [], sourceStart: lineStart, sourceEnd: lineEnd });
            continue;
        }

        const section = text.match(SECTION_LINE_REGEX);
        if (section) {
            const label = section[1] + (section[2] ? ` ${section[2].trim()}` : '');
            lines.push({ kind: 'section', label, lyricText: '', chords: [], sourceStart: lineStart, sourceEnd: lineEnd });
            continue;
        }

        const chords: SheetChord[] = [];
        let lyricText = '';
        let pos = 0;

        const markerRe = /\[([^[\]\n]*)\]/g;
        let marker: RegExpExecArray | null;
        while ((marker = markerRe.exec(text))) {
            const annotation = marker[1].startsWith('*');
            const raw = (annotation ? marker[1].slice(1) : marker[1]).trim();
            const parsed = annotation ? null : parseChordMarker(marker[1]);
            // Literal bracket text (and an empty [*]) stays in the lyric line.
            if (annotation ? !raw : !parsed) continue;
            lyricText += text.slice(pos, marker.index);
            const chord: SheetChord = {
                raw,
                parsed: parsed ?? annotationToken(raw),
                name: parsed ? resolvedChordName(parsed) : raw,
                annotation,
                col: lyricText.length,
                sourceStart: lineStart + marker.index,
                sourceEnd: lineStart + marker.index + marker[0].length,
                seqIndex: annotation ? -1 : chordSequence.length,
            };
            chords.push(chord);
            if (!annotation) chordSequence.push(chord);
            pos = marker.index + marker[0].length;
        }
        lyricText += text.slice(pos);

        lines.push({ kind: 'lyrics', lyricText, chords, sourceStart: lineStart, sourceEnd: lineEnd });
    }

    return { lines, chordSequence };
}

/**
 * Source offset where text inserted at a column of the stripped lyric text
 * lands: the column itself plus every chord marker at or before it. Columns
 * outside the line are clamped, so any click maps to a valid splice point.
 */
export function sourceOffsetAtCol(line: SheetLine, col: number): number {
    const clamped = Math.max(0, Math.min(col, line.lyricText.length));
    let offset = line.sourceStart + clamped;
    for (const chord of line.chords) {
        if (chord.col > clamped) break;
        offset += chord.sourceEnd - chord.sourceStart;
    }
    return offset;
}

/**
 * Serialize a parsed song to aligned chords-over-lyrics plain text (the
 * export format). Chord names are placed at their exact column in the
 * stripped lyric line; colliding chords are pushed right. Names keep their
 * spaces stripped so each chord stays a single token when re-imported.
 * Annotations serialize as their bare text in the chord row, like the
 * pasted sheet they came from.
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

        let chordRow = '';
        for (const chord of line.chords) {
            const name = chord.name.replace(/\s+/g, '');
            const at = chordRow.length === 0
                ? chord.col
                : Math.max(chord.col, chordRow.length + 1);
            chordRow = chordRow.padEnd(at, ' ') + name;
        }
        const lyricRow = line.lyricText.replace(/\s+$/, '');

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
): Omit<SheetChord, 'seqIndex' | 'col'> | null {
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
                annotation: false,
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

/**
 * Insert a new chord marker at a column on `line`, extending the line with
 * spaces first if the column falls past its current lyric text (see
 * `moveChordToColumn`), so a chord placed by clicking or dragging past the
 * end of short lyrics doesn't silently clamp back onto one already there.
 * `padBefore` adds a single separating space before the marker when it
 * would otherwise land directly against a non-space character (e.g. the
 * "add at end of line" action).
 */
export function insertChordAtColumn(
    source: string,
    line: SheetLine,
    col: number,
    chordName: string,
    padBefore = false
): string {
    const target = Math.max(0, col);
    if (target <= line.lyricText.length) {
        let offset = sourceOffsetAtCol(line, target);
        let spliced = source;
        if (padBefore && offset > 0 && !/\s/.test(spliced[offset - 1])) {
            spliced = `${spliced.slice(0, offset)} ${spliced.slice(offset)}`;
            offset += 1;
        }
        return insertChordInSource(spliced, offset, chordName);
    }
    const pad = ' '.repeat(target - line.lyricText.length);
    return insertChordInSource(
        source.slice(0, line.sourceEnd) + pad + source.slice(line.sourceEnd),
        line.sourceEnd + pad.length,
        chordName
    );
}

/** Replace an existing chord marker with a different chord. */
export function replaceChordInSource(source: string, chord: SheetChord, chordName: string): string {
    return (
        source.slice(0, chord.sourceStart) +
        `[${chordName.replace(/\s+/g, '')}]` +
        source.slice(chord.sourceEnd)
    );
}

/**
 * Transpose every recognizable chord in raw song source by a number of
 * semitones, in both formats: inline [Am] markers and bare chord words on
 * chords-over-lyrics lines. The typed chord-type suffix is preserved; only
 * the root (and slash bass) are respelled, with accidentals following
 * `preferFlats`. On bare chord lines the surrounding spacing is adjusted so
 * chords keep their columns over the lyric line below where possible.
 */
export function transposeSongSource(
    source: string,
    semitones: number,
    preferFlats: boolean
): string {
    return source
        .split('\n')
        .map(raw => {
            const hasCR = raw.endsWith('\r');
            let line = hasCR ? raw.slice(0, -1) : raw;
            const hits = lineChords(line);
            // Right-to-left so earlier hit offsets stay valid.
            for (let i = hits.length - 1; i >= 0; i--) {
                const hit = hits[i];
                if (!hit.parsed.root) continue;
                const root = transposeNoteName(hit.parsed.root, semitones, preferFlats);
                const slash = hit.parsed.slash
                    ? `/${transposeNoteName(hit.parsed.slash, semitones, preferFlats)}`
                    : '';
                const name = `${root}${hit.parsed.requestedSuffix}${slash}`;

                let end = hit.end;
                let pad = '';
                if (!hit.isMarker) {
                    // Keep column alignment: absorb/emit spaces after the word,
                    // always leaving at least one space before a following word.
                    let delta = name.length - (hit.end - hit.start);
                    while (delta > 0 && line[end] === ' ' && line[end + 1] === ' ') {
                        end++;
                        delta--;
                    }
                    if (delta < 0 && line[end] === ' ') pad = ' '.repeat(-delta);
                }
                line =
                    line.slice(0, hit.start) +
                    (hit.isMarker ? `[${name}]` : name + pad) +
                    line.slice(end);
            }
            return hasCR ? `${line}\r` : line;
        })
        .join('\n');
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

/**
 * Move a chord marker to a column on `targetLine` — e.g. a drag-and-drop
 * relocation, possibly onto a different line. `targetLine` and `targetCol`
 * are read against the *original* `source` (same one `chord`'s own offsets
 * refer to), same as the still-current parse `sourceOffsetAtCol` uses.
 * Vacates the old spot with the same space-collapsing rule as
 * `removeChordFromSource`, then re-inserts the marker's exact original text
 * so a move never changes a chord's spelling. A column past the target
 * line's current lyric text pads the line out to it with spaces first, so a
 * chord can be dragged further right than the words beneath it (e.g. a
 * trailing hit after the last word).
 */
export function moveChordToColumn(
    source: string,
    chord: SheetChord,
    targetLine: SheetLine,
    targetCol: number
): string {
    let start = chord.sourceStart;
    const end = chord.sourceEnd;
    if (
        start > 0 && source[start - 1] === ' ' &&
        (end >= source.length || source[end] === ' ' || source[end] === '\n' || source[end] === '\r')
    ) {
        start--;
    }
    const marker = source.slice(chord.sourceStart, end);
    const withoutChord = source.slice(0, start) + source.slice(end);

    const col = Math.max(0, targetCol);
    let rawInsertOffset: number;
    let pad = '';
    if (col <= targetLine.lyricText.length) {
        rawInsertOffset = sourceOffsetAtCol(targetLine, col);
    } else {
        rawInsertOffset = targetLine.sourceEnd;
        pad = ' '.repeat(col - targetLine.lyricText.length);
    }

    let insertAt = rawInsertOffset;
    if (insertAt > end) insertAt -= end - start;
    else if (insertAt > start) insertAt = start;

    return withoutChord.slice(0, insertAt) + pad + marker + withoutChord.slice(insertAt);
}

/**
 * Nearest column to `col` on `line` that isn't already occupied by another
 * chord (so a placed/moved chord never lands exactly on top of one already
 * there, which would render fully overlapping) — walks outward, preferring
 * rightward on ties. `ignore` excludes a chord from the occupied set, e.g.
 * the one currently being dragged, so dropping it back near its own spot
 * doesn't get needlessly bumped away from itself.
 */
export function nextFreeColumn(line: SheetLine, col: number, ignore?: SheetChord): number {
    const occupied = new Set(
        line.chords.filter(c => c !== ignore).map(c => c.col)
    );
    const start = Math.max(0, col);
    if (!occupied.has(start)) return start;
    for (let step = 1; ; step++) {
        if (!occupied.has(start + step)) return start + step;
        if (start - step >= 0 && !occupied.has(start - step)) return start - step;
    }
}
