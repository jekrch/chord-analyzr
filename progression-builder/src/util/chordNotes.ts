// Derive a chord's notes from its name alone, for chords the diatonic chord
// list doesn't contain — slash voicings from slashWeight and borrowed-root
// chords from colorWeight. Mirrors the interval tables and slash handling of
// api-go/internal/mcpserver/chordurl.go.
import { CHORD_TYPES } from '../link/chordTypes';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord types the DB can name but CHORD_TYPES doesn't list. Kept separate
// because the CHORD_TYPES key set drives the link type→code mapping and
// must stay identical to the main app's (see chordTypes.ts).
const DERIVE_ONLY_TYPES: Record<string, number[]> = {
  '13#b9': [0, 4, 7, 21, 22],
  '13#sus4': [0, 2, 5, 7, 22],
};
const BASE_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function parseNote(s: string): { pc: number; rest: string } | null {
  const base = BASE_PITCH[s[0]];
  if (base === undefined) return null;
  let i = 1;
  let accidental = '';
  while (i < s.length && (s[i] === '#' || s[i] === 'b')) {
    if (accidental && s[i] !== accidental[0]) return null;
    accidental += s[i];
    i++;
  }
  if (accidental.length > 2) return null;
  const shift = accidental[0] === '#' ? accidental.length : accidental ? -accidental.length : 0;
  return { pc: ((base + shift) % 12 + 12) % 12, rest: s.slice(i) };
}

// A trailing "/<note>" is a slash bass only when what follows is a plain note
// name; chord types themselves may contain slashes ("6/9", "m/Maj7").
function splitSlashBass(chordName: string): { main: string; bass: string } {
  const idx = chordName.lastIndexOf('/');
  if (idx > 0 && idx < chordName.length - 1) {
    const after = chordName.slice(idx + 1);
    if (/^[A-G](?:##|#|bb|b)?$/.test(after)) {
      return { main: chordName.slice(0, idx), bass: after };
    }
  }
  return { main: chordName, bass: '' };
}

// Returns the chord's note names (sharp-spelled, comma-separated, bass first
// for slash chords) or null when the name can't be read. The format matches
// chordNoteNames from the API, so it feeds parseNoteList and encodeChordNotes.
export function deriveChordNotes(chordName: string): string | null {
  const { main, bass } = splitSlashBass(chordName.trim());
  const root = parseNote(main);
  if (!root) return null;
  const intervals = CHORD_TYPES[root.rest] ?? DERIVE_ONLY_TYPES[root.rest];
  if (!intervals) return null;

  let pitches = intervals.map((iv) => ((root.pc + iv) % 12 + 12) % 12);

  if (bass) {
    const bassNote = parseNote(bass);
    if (!bassNote || bassNote.rest !== '') return null;
    // Voice the bass first and drop it from the upper notes, matching how the
    // main app builds a slash chord.
    pitches = [bassNote.pc, ...pitches.filter((p) => p !== bassNote.pc)];
  }

  return pitches.map((p) => SHARP_NAMES[p]).join(', ');
}

// The chord name without any slash-bass suffix — the form the engine's chord
// list knows ("Cmaj7/E" -> "Cmaj7").
export function chordBaseName(chordName: string): string {
  return splitSlashBass(chordName.trim()).main;
}

// Move a chord's voicing one chord tone up or down. Note order is the
// voicing — this app's synth and the main buildr app both voice a chord
// ascending from its first listed note — so rotating the order is the one
// register control a shareable link can carry. Up sends the bass to the top
// (next inversion), down drops the top note into the bass. The name keeps
// slash notation honest: C up once is C/E, and a rotation that lands back
// on the root drops the slash.
export function shiftVoicing(
  name: string,
  notes: string,
  direction: -1 | 1,
): { name: string; notes: string } | null {
  const noteNames = notes
    .split(/[,\s]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (noteNames.length < 2) return null;

  const rotated =
    direction === 1
      ? [...noteNames.slice(1), noteNames[0]]
      : [noteNames[noteNames.length - 1], ...noteNames.slice(0, -1)];

  const main = chordBaseName(name);
  const root = parseNote(main);
  const bass = parseNote(rotated[0]);
  if (!root || !bass || bass.rest !== '') return null;

  return {
    name: bass.pc === root.pc ? main : `${main}/${rotated[0]}`,
    notes: rotated.join(', '),
  };
}
