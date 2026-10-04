import { MidiNumbers } from 'react-piano';

const enharmonicEquivalents: Record<string, string> = {
    'C##': 'D',
    'D##': 'E',
    'E#': 'F',
    'F##': 'G',
    'G##': 'A',
    'A##': 'B',
    'B#': 'C',
    'Cb': 'B',
    'Db': 'C#',
    'Eb': 'D#',
    'Fb': 'E',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
    'Dbb': 'C',
    'Ebb': 'D',
    'Fbb': 'E',
    'Gbb': 'F',
    'Abb': 'G',
    'Bbb': 'A',
    'Cbb': 'B',
};

export const normalizeNoteName = (noteName?: string) => {
    if (!noteName) return;
    return enharmonicEquivalents[noteName] || noteName;
};

export function normalizeNoteWithOctave(note?: string): string | undefined {
    if (!note) return note; 

    const notePart = note.substring(0, note.length - 1);
    const octavePart = note.substring(note.length - 1);

    const normalizedNote = enharmonicEquivalents[notePart];

    if (!normalizedNote) return note; 
  
    let octave = parseInt(octavePart, 10);
  
    if (notePart === 'B#' && normalizedNote === 'C') {
      octave += 1; 
    } else if (notePart === 'Cb' && normalizedNote === 'B') {
      // no need to decrement the octave for 'Cb' as it remains in the same octave
    }
  
    return `${normalizedNote}${octave}`;
}

export const convertToStandardNoteName = (noteName: string): string => {
    if (!noteName || noteName.length === 0) return 'C';
    
    const baseNote = noteName.charAt(0).toUpperCase();
    const accidentals = noteName.slice(1);
    
    const baseNoteMap: Record<string, number> = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    let semitones = baseNoteMap[baseNote];
    if (semitones === undefined) return 'C';
    
    const sharps = (accidentals.match(/#/g) || []).length;
    const flats = (accidentals.match(/b/g) || []).length;
    
    semitones += sharps - flats;
    semitones = ((semitones % 12) + 12) % 12;
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[semitones];
};

// Cache for MIDI note values
const midiNoteCache = new Map<string, number>();

export const getMidiNote = (note: string, octave: number): number => {
    // Create a unique cache key
    const cacheKey = `${note}-${octave}`;
    
    // Check if value exists in cache
    if (midiNoteCache.has(cacheKey)) {
        return midiNoteCache.get(cacheKey)!;
    }
    
    // Compute the MIDI note value
    const midiNote = MidiNumbers.fromNote(`${convertToStandardNoteName(note)}${octave}`);
    
    // Store in cache
    midiNoteCache.set(cacheKey, midiNote);
    
    return midiNote;
};

export const clearMidiNoteCache = () => {
    midiNoteCache.clear();
};

const FLAT_KEY_SIGNATURES = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

const SHARP_TO_FLAT: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
};

const LETTER_PITCH_CLASS: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

/**
 * Builds a function that respells normalized (sharp-spelled) notes to match a
 * key signature for display on a staff. Pitches that occur in the given scale
 * use the scale's own spelling (e.g. Eb rather than D# in flat keys, or B#
 * rather than C in C# major); out-of-scale pitches fall back to flat spellings
 * in flat keys and are left as-is in sharp keys.
 *
 * @param scaleNoteNames - raw scale spellings, e.g. ["F", "G", "A", "Bb", ...]
 * @param keySignature - the key signature tonic, e.g. "Bb"
 * @returns (note, octave) -> spelling with an octave adjusted so respellings
 *          across the B/C boundary (B#, Cb) keep the same sounding pitch
 */
export function createKeySpeller(
    scaleNoteNames: (string | undefined)[],
    keySignature: string
): (note: string, octave: number) => { note: string; octave: number } {
    const spellingByPitchClass = new Map<number, string>();
    scaleNoteNames.forEach(name => {
        if (!name) return;
        const pitchClass = noteNameToNumber(name);
        if (!spellingByPitchClass.has(pitchClass)) {
            spellingByPitchClass.set(pitchClass, name);
        }
    });
    const preferFlats = FLAT_KEY_SIGNATURES.has(keySignature);

    return (note: string, octave: number) => {
        const pitchClass = noteNameToNumber(note);
        const spelled = spellingByPitchClass.get(pitchClass)
            ?? (preferFlats ? SHARP_TO_FLAT[note] : undefined)
            ?? note;
        if (spelled === note) return { note, octave };

        const letterPitchClass = LETTER_PITCH_CLASS[spelled.charAt(0).toUpperCase()];
        if (letterPitchClass === undefined) return { note, octave };
        const accidentals = spelled.slice(1);
        const offset = (accidentals.match(/#/g) || []).length
            - (accidentals.match(/b/g) || []).length;
        // 0 for same-letter respellings, ±12 across the B/C boundary
        const octaveShift = (pitchClass - letterPitchClass - offset) / 12;
        return { note: spelled, octave: octave + octaveShift };
    };
}

const PITCH_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PITCH_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Spellings used when the caller expresses no flat/sharp preference: the
// key signature with fewer accidentals (Db, Eb, Ab, Bb) except F#, which is
// conventionally preferred over Gb.
const PITCH_NAMES_CONVENTIONAL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Transpose a note name by a number of semitones. Accidental spelling for
 * the black keys follows `preferFlats`; when omitted, conventional key
 * spellings are used (Db, Eb, F#, Ab, Bb).
 */
export function transposeNoteName(
    note: string,
    semitones: number,
    preferFlats?: boolean
): string {
    const pc = (((noteNameToNumber(note) + semitones) % 12) + 12) % 12;
    if (preferFlats === undefined) return PITCH_NAMES_CONVENTIONAL[pc];
    return preferFlats ? PITCH_NAMES_FLAT[pc] : PITCH_NAMES_SHARP[pc];
}

/**
   * Helper to convert note name to MIDI note number (0-11)
   */
  export function noteNameToNumber(noteName: string): number {
    if (!noteName || noteName.length === 0) return 0;

    const baseNote = noteName.charAt(0).toUpperCase();
    const accidentals = noteName.slice(1).replace(/\d+/g, ''); // Remove octave numbers

    const baseNoteMap: Record<string, number> = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };

    let midiNote = baseNoteMap[baseNote];
    if (midiNote === undefined) return 0;

    const sharps = (accidentals.match(/#/g) || []).length;
    const flats = (accidentals.match(/b/g) || []).length;

    midiNote += sharps;
    midiNote -= flats;

    return ((midiNote % 12) + 12) % 12;
  }
// Pitch of a spelled note in scientific notation, where the octave belongs to
// the letter (so Cb4 sounds as B3 and B#4 as C5)
const spelledPitch = (note: string, octave: number): number => {
    const accidentals = note.slice(1);
    return 12 * (octave + 1)
        + LETTER_PITCH_CLASS[note.charAt(0).toUpperCase()]
        + (accidentals.match(/#/g) || []).length
        - (accidentals.match(/b/g) || []).length;
};

const LETTERS = 'CDEFGAB';

// True when `upper` is a minor or major third above `lower` and written two
// letters up (E -> G#, not E -> Ab)
const isSpelledThird = (lower: string, upper: string): boolean => {
    const letterSteps = (LETTERS.indexOf(upper.charAt(0)) - LETTERS.indexOf(lower.charAt(0)) + 7) % 7;
    const semitones = (noteNameToNumber(upper) - noteNameToNumber(lower) + 12) % 12;
    return letterSteps === 2 && (semitones === 3 || semitones === 4);
};

/**
 * Spells a chord's notes for a staff in the given key and stacks them upward
 * from the root, the same voicing playback uses.
 *
 * In-scale pitches take the scale's spelling so the key signature covers
 * them. Out-of-scale pitches pick between the chord's own spelling and the
 * sharp/flat names, favoring ones that form a written third with a neighbor
 * and don't reuse a letter — so an E chord in C reads E G# B, not E Ab B.
 *
 * @param chordNotes - chord tones root first, e.g. ["E", "G#", "B"]
 * @param scaleNoteNames - raw scale spellings, e.g. ["C", "D", "E", ...]
 * @param keySignature - the key signature tonic, e.g. "C"
 * @param rootOctave - octave of the root note
 */
export function spellChordForStaff(
    chordNotes: string[],
    scaleNoteNames: string[],
    keySignature: string,
    rootOctave = 4
): { note: string; octave: number }[] {
    const scaleSpelling = new Map<number, string>();
    scaleNoteNames.forEach(name => {
        const pitchClass = noteNameToNumber(name);
        if (!scaleSpelling.has(pitchClass)) scaleSpelling.set(pitchClass, name);
    });
    const preferFlats = FLAT_KEY_SIGNATURES.has(keySignature);

    const notes = chordNotes
        .map(note => note.trim())
        .filter(note => LETTER_PITCH_CLASS[note.charAt(0).toUpperCase()] !== undefined)
        .map(note => note.charAt(0).toUpperCase() + note.slice(1));

    const spelled = notes.map(note => scaleSpelling.get(noteNameToNumber(note)));
    const usedLetters = new Set(spelled.filter(Boolean).map(note => note!.charAt(0)));

    notes.forEach((note, index) => {
        if (spelled[index]) return;
        const pitchClass = noteNameToNumber(note);
        const preferred = (preferFlats ? PITCH_NAMES_FLAT : PITCH_NAMES_SHARP)[pitchClass];
        const other = (preferFlats ? PITCH_NAMES_SHARP : PITCH_NAMES_FLAT)[pitchClass];
        const below = spelled[index - 1];
        const above = spelled[index + 1];

        const score = (candidate: string) =>
            (usedLetters.has(candidate.charAt(0)) ? -10 : 0)
            + (below && isSpelledThird(below, candidate) ? 2 : 0)
            + (above && isSpelledThird(candidate, above) ? 2 : 0)
            + (candidate === note ? 1 : 0)
            + (candidate === preferred ? 0.5 : 0);

        const choice = [note, preferred, other]
            .reduce((best, candidate) => (score(candidate) > score(best) ? candidate : best));
        spelled[index] = choice;
        usedLetters.add(choice.charAt(0));
    });

    let previousPitch = -Infinity;
    let octave = rootOctave;
    return spelled.map((note, index) => {
        if (index > 0) {
            octave -= 1;
            while (spelledPitch(note!, octave) <= previousPitch) octave += 1;
        }
        previousPitch = spelledPitch(note!, octave);
        return { note: note!, octave };
    });
}
