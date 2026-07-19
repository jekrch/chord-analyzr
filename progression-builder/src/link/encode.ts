// Minimal port of the encode half of frontend/src/util/url/{encoders,stateSerializer}.ts —
// just enough to build a "v9" state string the main modal chord buildr app can
// decode. Only encoding is needed here; this app never reads links back.
import { CHORD_TYPES } from './chordTypes';

const NOTE_TO_PITCH: Record<string, string> = {
  C: '0', D: '1', E: '2', F: '3', G: '4', A: '5', B: '6',
};

const CHROMATIC_NOTE_TO_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
  'C##': 2, Cbb: 10, 'D##': 4, Dbb: 0, 'E##': 6, Ebb: 2,
  'F##': 7, Fbb: 3, 'G##': 9, Gbb: 5, 'A##': 11, Abb: 7,
  'B##': 1, Bbb: 9,
};

const toBase36 = (num: number): string => Math.max(0, Math.round(num)).toString(36);

function generateChordTypeCodes(chordTypes: Record<string, unknown>): Record<string, string> {
  const sortedTypes = Object.keys(chordTypes).sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });

  const typeToCode: Record<string, string> = {};
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const generateCode = (idx: number): string => {
    if (idx < 62) return chars[idx];
    const first = Math.floor((idx - 62) / 36);
    const second = (idx - 62) % 36;
    return (first + 1).toString() + chars[second];
  };

  sortedTypes.forEach((type, idx) => {
    typeToCode[type] = generateCode(idx);
  });

  return typeToCode;
}

// Stable across both apps because CHORD_TYPES mirrors the same fixed key set.
const TYPE_TO_CODE = generateChordTypeCodes(CHORD_TYPES);

interface ParsedNote {
  encodedNote: string;
  remaining: string;
}

function parseNoteFromChordName(chordName: string): ParsedNote | null {
  let pos = 0;
  const root = chordName[pos++];
  if (!NOTE_TO_PITCH[root]) return null;

  let encodedNote = NOTE_TO_PITCH[root];
  let accidentalCount = 0;
  let accidentalType = '';

  while (pos < chordName.length && (chordName[pos] === '#' || chordName[pos] === 'b')) {
    if (!accidentalType) {
      accidentalType = chordName[pos];
    } else if (chordName[pos] !== accidentalType) {
      return null;
    }
    accidentalCount++;
    pos++;
  }

  if (accidentalCount === 2 && accidentalType === '#') encodedNote += 'S';
  else if (accidentalCount === 2 && accidentalType === 'b') encodedNote += 'F';
  else if (accidentalCount === 1 && accidentalType === '#') encodedNote += 's';
  else if (accidentalCount === 1 && accidentalType === 'b') encodedNote += 'f';

  return { encodedNote, remaining: chordName.substring(pos) };
}

export function encodeChordNotes(notesString: string): string {
  const noteNames = notesString
    .split(/[,\s]+/)
    .map((n) => n.trim())
    .filter(Boolean);

  const indices: string[] = [];
  for (const noteName of noteNames) {
    const index = CHROMATIC_NOTE_TO_INDEX[noteName];
    if (index === undefined) return '';
    indices.push(index.toString(36));
  }

  return indices.join('-');
}

export function encodeChordName(chordName: string): string {
  let bassNoteName: string | undefined;
  let mainChordName = chordName;

  const slashIndex = chordName.lastIndexOf('/');
  if (slashIndex > 0 && slashIndex < chordName.length - 1) {
    const potentialBassNote = chordName.substring(slashIndex + 1);
    if (/^[A-G](?:##|#|bb|b)?$/.test(potentialBassNote)) {
      mainChordName = chordName.substring(0, slashIndex);
      bassNoteName = potentialBassNote;
    }
  }

  const mainChordParsed = parseNoteFromChordName(mainChordName);
  if (!mainChordParsed) return '';

  const { encodedNote: encodedMainNote, remaining: chordType } = mainChordParsed;
  const typeCode = TYPE_TO_CODE[chordType];
  if (typeCode === undefined) return '';

  let encodedChord = `${encodedMainNote}.${typeCode}`;

  if (bassNoteName) {
    const bassNoteParsed = parseNoteFromChordName(bassNoteName);
    if (!bassNoteParsed || bassNoteParsed.remaining.length > 0) return '';
    encodedChord += `/${bassNoteParsed.encodedNote}`;
  }

  return encodedChord;
}

export const toBase36Index = toBase36;
