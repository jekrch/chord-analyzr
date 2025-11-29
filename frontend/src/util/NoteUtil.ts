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

    let notePart = note.substring(0, note.length - 1);
    let octavePart = note.substring(note.length - 1);

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