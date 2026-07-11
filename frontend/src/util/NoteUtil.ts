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