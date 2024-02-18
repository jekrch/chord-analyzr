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
    // if the noteName exists in the mapping, return its equivalent, 
    // otherwise return the noteName unchanged
    return enharmonicEquivalents[noteName] || noteName;
};

export function normalizeNoteWithOctave(note?: string): string | undefined {
   
    if (!note) return note; 

    let notePart = note.substring(0, note.length - 1);
    let octavePart = note.substring(note.length -1);

    const normalizedNote = enharmonicEquivalents[notePart];

    // return the original note if no enharmonic equivalent is found
    if (!normalizedNote) return note; 
  
    let octave = parseInt(octavePart, 10);
  
    // special handling for 'B#' going to 'C' and 'Cb' going to 'B'
    if (notePart === 'B#' && normalizedNote === 'C') {
      // increment the octave for 'B#' as it's technically the next 'C'
      octave += 1; 
    } else if (notePart === 'Cb' && normalizedNote === 'B') {
      // no need to decrement the octave for 'Cb' as it remains in the same octave
    }
  
    return `${normalizedNote}${octave}`;
  }