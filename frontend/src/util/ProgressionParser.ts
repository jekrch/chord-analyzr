/**
 * Progression Parser
 * Parses a free-text chord progression string (e.g. "Am F C G" or
 * "Dm7, G7, Cmaj7") against the app's chord vocabulary. Unknown chord
 * types are resolved to their nearest matches so the user can review
 * and pick an alternative. Also infers the best-fitting key/mode for
 * a set of parsed chords.
 */

import { Chord, Interval } from 'tonal';
import { dynamicChordGenerator } from '../services/DynamicChordService';
import { staticDataService } from '../services/StaticDataService';
import { noteNameToNumber } from './NoteUtil';

export interface ChordCandidate {
    chordType: string; // key into dynamicChordGenerator.chordTypes ('' = major)
    score: number;     // 0..1, higher is closer to what the user typed
}

export type TokenMatchType = 'exact' | 'alias' | 'nearest' | 'invalid';

export interface ParsedChordToken {
    token: string;            // original text as typed
    root: string | null;      // normalized root, e.g. "Bb" (null when unparseable)
    requestedSuffix: string;  // suffix as typed (after unicode cleanup)
    slash: string | null;     // slash bass note, e.g. "E" in "C/E"
    matchType: TokenMatchType;
    selectedType: string | null;   // chosen chord type (null when invalid)
    candidates: ChordCandidate[];  // ranked near matches (nearest matches only)
}

export interface KeyModeSuggestion {
    key: string;
    mode: string;
    coverage: number; // 0..1 fraction of chord tones inside the suggested scale
}

// Common alternate spellings for chord types, checked before fuzzy matching.
// Keys are matched case-sensitively first ('M7' must not collapse into 'm7').
const SUFFIX_ALIASES: Record<string, string> = {
    'M': '', 'maj': '', 'Maj': '', 'major': '', 'Major': '',
    'M7': 'maj7', 'Ma7': 'maj7', 'M9': 'maj9', 'M11': 'maj11', 'M13': 'maj13',
    'Δ': 'maj7', '∆': 'maj7', 'Δ7': 'maj7', '∆7': 'maj7', 'Δ9': 'maj9', '∆9': 'maj9',
    'min': 'm', 'Min': 'm', 'minor': 'm', 'Minor': 'm', '-': 'm',
    'min6': 'm6', '-6': 'm6',
    'min7': 'm7', '-7': 'm7',
    'min9': 'm9', '-9': 'm9',
    'min11': 'm11', '-11': 'm11',
    'min13': 'm13', '-13': 'm13',
    '+': 'aug', '+5': 'aug', '+7': 'aug7', '7+': 'aug7', '7+5': 'aug7',
    '°': 'dim', 'o': 'dim', '°7': 'dim7', 'o7': 'dim7',
    'ø': 'm7b5', 'ø7': 'm7b5', 'Ø': 'm7b5', 'Ø7': 'm7b5',
    '-7b5': 'm7b5', 'min7b5': 'm7b5', 'm7-5': 'm7b5',
    'sus': 'sus4', '7sus': '7sus4',
    'dom': '7', 'dom7': '7',
    'add9': 'add(9)', 'add2': 'add(2)', 'add4': 'add(4)',
    '(add9)': 'add(9)', '(add2)': 'add(2)', '(add4)': 'add(4)',
    'madd2': 'm add(2)', 'madd4': 'm add(4)',
    'minadd9': 'm add(9)', 'm(add9)': 'm add(9)',
    '69': '6/9', 'm69': 'm6/9',
    'mM7': 'm/Maj7', 'mMaj7': 'm/Maj7', 'mmaj7': 'm/Maj7', 'minmaj7': 'm/Maj7', 'm(maj7)': 'm/Maj7',
    'mM9': 'm/Maj9', 'mMaj9': 'm/Maj9', 'mmaj9': 'm/Maj9',
    'alt': '7alt', 'alt7': '7alt',
    'aug5': 'aug',
};

const NOTE_REGEX = /^[A-Ha-h](?:##|bb|#|b)?$/;
const ROOT_REGEX = /^([A-Ha-h])(##|bb|#|b)?(.*)$/;

const KEY_SPELLINGS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_SPELLINGS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Lookup of lowercase, space-stripped type name -> canonical type name, so
// "MAJ7" or "madd(2)" (chord names round-tripped without spaces) still hit.
let relaxedTypeLookup: Map<string, string> | null = null;
function getRelaxedTypeLookup(): Map<string, string> {
    if (!relaxedTypeLookup) {
        relaxedTypeLookup = new Map();
        for (const type of Object.keys(dynamicChordGenerator.chordTypes)) {
            const relaxed = type.toLowerCase().replace(/\s+/g, '');
            if (!relaxedTypeLookup.has(relaxed)) {
                relaxedTypeLookup.set(relaxed, type);
            }
        }
    }
    return relaxedTypeLookup;
}

function cleanupUnicode(text: string): string {
    return text
        .replace(/♯/g, '#')
        .replace(/♭/g, 'b')
        .replace(/𝄪/g, '##')
        .replace(/𝄫/g, 'bb');
}

/** Split a progression string into chord tokens. */
export function tokenizeProgression(input: string): string[] {
    return cleanupUnicode(input)
        .split(/[\s,;|]+|->|→/)
        .map(t => t.trim())
        .filter(Boolean);
}

function normalizeRoot(letter: string, accidental: string | undefined): string {
    const upper = letter.toUpperCase();
    // German notation: H is B natural
    const base = upper === 'H' ? 'B' : upper;
    return base + (accidental || '');
}

function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        prev = curr;
    }
    return prev[b.length];
}

/** Pitch classes (relative to root) tonal hears in the typed symbol, if any. */
function tonalPitchClasses(root: string, suffix: string): Set<number> | null {
    try {
        const parsed = Chord.get(`${root}${suffix}`);
        if (parsed.empty || !parsed.intervals?.length) return null;
        const semis = parsed.intervals
            .map(i => Interval.semitones(i))
            .filter((n): n is number => typeof n === 'number');
        if (!semis.length) return null;
        return new Set(semis.map(s => ((s % 12) + 12) % 12));
    } catch {
        return null;
    }
}

function jaccard(a: Set<number>, b: Set<number>): number {
    let intersection = 0;
    a.forEach(v => { if (b.has(v)) intersection++; });
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/**
 * Rank every known chord type by similarity to the typed suffix, blending
 * interval-content similarity (when tonal understands the symbol) with
 * plain string distance.
 */
export function rankChordTypeCandidates(root: string, suffix: string, limit: number = 6): ChordCandidate[] {
    const target = suffix.toLowerCase().replace(/\s+/g, '');
    const heardPcs = tonalPitchClasses(root, suffix);

    const results: ChordCandidate[] = Object.entries(dynamicChordGenerator.chordTypes).map(([type, intervals]) => {
        const candidate = type.toLowerCase().replace(/\s+/g, '');
        const strSim = 1 - levenshtein(target, candidate) / Math.max(target.length, candidate.length, 1);
        let score = strSim;
        if (heardPcs) {
            const pcs = new Set(intervals.map(i => ((i % 12) + 12) % 12));
            score = 0.65 * jaccard(heardPcs, pcs) + 0.35 * strSim;
        }
        return { chordType: type, score };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
}

function resolveSuffix(suffix: string): { type: string; via: 'exact' | 'alias' } | null {
    const chordTypes = dynamicChordGenerator.chordTypes;
    if (chordTypes[suffix] !== undefined) {
        return { type: suffix, via: 'exact' };
    }
    if (SUFFIX_ALIASES[suffix] !== undefined) {
        return { type: SUFFIX_ALIASES[suffix], via: 'alias' };
    }
    const relaxed = suffix.toLowerCase().replace(/\s+/g, '');
    const canonical = getRelaxedTypeLookup().get(relaxed);
    if (canonical !== undefined) {
        return { type: canonical, via: canonical === suffix ? 'exact' : 'alias' };
    }
    const aliasedRelaxed = SUFFIX_ALIASES[relaxed];
    if (aliasedRelaxed !== undefined) {
        return { type: aliasedRelaxed, via: 'alias' };
    }
    return null;
}

/** Parse a single chord token (e.g. "F#m7b5" or "C/E"). */
export function parseChordToken(token: string): ParsedChordToken {
    const cleaned = cleanupUnicode(token);

    // Only treat a trailing "/X" as a slash bass note when X is a plain note
    // name; chord types themselves contain slashes ("6/9", "m/Maj7").
    let body = cleaned;
    let slash: string | null = null;
    const slashIndex = cleaned.lastIndexOf('/');
    if (slashIndex > 0) {
        const afterSlash = cleaned.substring(slashIndex + 1);
        if (NOTE_REGEX.test(afterSlash)) {
            const slashMatch = afterSlash.match(ROOT_REGEX)!;
            slash = normalizeRoot(slashMatch[1], slashMatch[2]);
            body = cleaned.substring(0, slashIndex);
        }
    }

    const match = body.match(ROOT_REGEX);
    if (!match) {
        return {
            token,
            root: null,
            requestedSuffix: body,
            slash,
            matchType: 'invalid',
            selectedType: null,
            candidates: [],
        };
    }

    const root = normalizeRoot(match[1], match[2]);
    const suffix = match[3];

    const resolved = resolveSuffix(suffix);
    if (resolved) {
        return {
            token,
            root,
            requestedSuffix: suffix,
            slash,
            matchType: resolved.via,
            selectedType: resolved.type,
            candidates: [],
        };
    }

    const candidates = rankChordTypeCandidates(root, suffix);
    return {
        token,
        root,
        requestedSuffix: suffix,
        slash,
        matchType: 'nearest',
        selectedType: candidates[0]?.chordType ?? null,
        candidates,
    };
}

/** Parse a whole progression string into matched chord tokens. */
export function parseProgression(input: string): ParsedChordToken[] {
    return tokenizeProgression(input).map(parseChordToken);
}

/** Display name for a parsed token with its currently selected type. */
export function resolvedChordName(token: ParsedChordToken): string {
    if (!token.root || token.selectedType === null) return token.token;
    return `${token.root}${token.selectedType}${token.slash ? `/${token.slash}` : ''}`;
}

/**
 * Serialize added chord names back into an editable progression string.
 * Spaces inside chord type names are stripped so each chord stays one token.
 */
export function progressionToString(chordNames: string[]): string {
    return chordNames.map(name => name.replace(/\s+/g, '')).join(' ');
}

/**
 * Find the key/mode whose scale best covers the progression's chord tones.
 * Ties break toward scales whose tonic matches the first (then last) chord's
 * root, and toward earlier modes in the app's mode list (Ionian, Dorian, ...).
 */
export async function inferKeyAndMode(
    tokens: ParsedChordToken[],
    modes: string[]
): Promise<KeyModeSuggestion | null> {
    const chords = tokens.filter(t => t.root && t.selectedType !== null);
    if (!chords.length || !modes.length) return null;

    const chordInfos = chords.map(t => {
        const rootPc = noteNameToNumber(t.root!);
        const intervals = dynamicChordGenerator.chordTypes[t.selectedType!] || [0];
        const pcs = new Set(intervals.map(i => (rootPc + i) % 12));
        if (t.slash) pcs.add(noteNameToNumber(t.slash));
        const third = intervals.includes(4) ? 4 : intervals.includes(3) ? 3 : null;
        const isDominant7 = intervals.includes(4) && intervals.includes(10);
        return { rootPc, pcs, third, isDominant7 };
    });
    const chordPcSets = chordInfos.map(c => c.pcs);
    const rootPcs = chordInfos.map(c => c.rootPc);

    // Prefer flat key spellings when the typed chords lean flat; each pitch
    // class also carries its enharmonic fallback since the scale data doesn't
    // include every spelling (e.g. it has A# but no Bb)
    const flats = chords.filter(t => t.root!.includes('b')).length;
    const sharps = chords.filter(t => t.root!.includes('#')).length;
    const preferFlats = flats > sharps;
    const keySpellings = KEY_SPELLINGS_SHARP.map((sharpName, pc) => {
        const flatName = KEY_SPELLINGS_FLAT[pc];
        return preferFlats ? [flatName, sharpName] : [sharpName, flatName];
    });

    // Warm the per-mode scale cache in parallel before the scoring loop
    await Promise.all(modes.map(mode =>
        staticDataService.getScaleNotes('C', mode).catch(() => [])
    ));

    const getScaleNotes = async (keyName: string, mode: string) => {
        try {
            const notes = await staticDataService.getScaleNotes(keyName, mode);
            return notes?.length ? notes : null;
        } catch {
            return null;
        }
    };

    let best: (KeyModeSuggestion & { score: number }) | null = null;

    for (let modeIndex = 0; modeIndex < modes.length; modeIndex++) {
        const mode = modes[modeIndex];
        for (const spellings of keySpellings) {
            let keyName = spellings[0];
            let scaleNotes = await getScaleNotes(keyName, mode);
            if (!scaleNotes && spellings[1] !== keyName) {
                keyName = spellings[1];
                scaleNotes = await getScaleNotes(keyName, mode);
            }
            if (!scaleNotes) continue;

            const scalePcs = new Set(
                scaleNotes
                    .filter(n => n.noteName)
                    .map(n => noteNameToNumber(n.noteName!))
            );

            let coverage = 0;
            for (const pcs of chordPcSets) {
                let inScale = 0;
                pcs.forEach(pc => { if (scalePcs.has(pc)) inScale++; });
                coverage += inScale / pcs.size;
            }
            coverage /= chordPcSets.length;

            const tonicPc = noteNameToNumber(keyName);
            let score = coverage;

            // A chord rooted on the tonic is strong evidence, stronger still
            // when its quality (major/minor third) agrees with the scale
            const tonicChord = chordInfos.find(c => c.rootPc === tonicPc);
            if (tonicChord) {
                score += 0.02;
                if (tonicChord.third !== null && scalePcs.has((tonicPc + tonicChord.third) % 12)) {
                    score += 0.03;
                }
            }
            // Progressions tend to start (and often end) on the tonic
            if (tonicPc === rootPcs[0]) score += 0.04;
            if (tonicPc === rootPcs[rootPcs.length - 1]) score += 0.02;
            // A dominant seventh on the 5th degree points at this tonic (V7 -> I)
            if (chordInfos.some(c => c.isDominant7 && c.rootPc === (tonicPc + 7) % 12)) {
                score += 0.04;
            }
            if (rootPcs.every(pc => scalePcs.has(pc))) score += 0.02;
            score -= modeIndex * 0.005;

            if (!best || score > best.score) {
                best = { key: keyName, mode, coverage, score };
            }
        }
    }

    if (!best) return null;
    return { key: best.key, mode: best.mode, coverage: best.coverage };
}

/**
 * Generate the playable notes for a parsed token in the given key/mode,
 * spelling notes to fit the scale (same generator the rest of the app uses).
 */
export async function buildProgressionChord(
    token: ParsedChordToken,
    key: string,
    mode: string
): Promise<{ name: string; notes: string } | null> {
    if (!token.root || token.selectedType === null) return null;

    const generated = await dynamicChordGenerator.generateChord(token.root, token.selectedType, key, mode);
    if (!generated) return null;

    let name = generated.chordName;
    let notes = generated.chordNoteNames;

    if (token.slash) {
        const slashGenerated = await dynamicChordGenerator.generateChord(token.slash, '', key, mode);
        const slashNote = slashGenerated
            ? slashGenerated.chordNoteNames.split(',')[0].trim()
            : token.slash;
        const slashPc = noteNameToNumber(slashNote);
        const noteArr = notes.split(',').map(n => n.trim());
        const filtered = noteArr.filter(n => noteNameToNumber(n) !== slashPc);
        notes = [slashNote, ...filtered].join(', ');
        name = `${name}/${slashNote}`;
    }

    return { name, notes };
}
