/**
 * For the provided scale notes, return a major scale that shares the same 
 * accidentals, which can then be used as the key signature:
 * 
 * e.g. the notes in C Lydian would share the key signature of G Major
 * 
 * @param scale 
 * @returns 
 */
export function convertScaleToMajorKey(scale: String[]): string | null {
    // count accidentals
    const accidentalCounts = { sharp: 0, flat: 0, doubleSharp: 0, doubleFlat: 0 };
    
    scale.forEach(note => {
      if (note.includes('##')) accidentalCounts.doubleSharp++;
      else if (note.includes('bb')) accidentalCounts.doubleFlat++;
      else if (note.includes('#')) accidentalCounts.sharp++;
      else if (note.includes('b')) accidentalCounts.flat++;
    });
  
    // more sharps/flats indicate key's accidentals directly
    // this doesn't account for modes or altered scales
    if (accidentalCounts.sharp || accidentalCounts.doubleSharp) {
      switch (accidentalCounts.sharp + 2 * accidentalCounts.doubleSharp) {
        case 1: return 'G Major';
        case 2: return 'D Major';
        case 3: return 'A Major';
        case 4: return 'E Major';
        case 5: return 'B Major';
        case 6: return 'F# Major';
        case 7: return 'C# Major';
        default: 
            console.error(`No major equivalent found for scale: ${scale}`) 
            return null; // not a standard major scale
      }
    } else if (accidentalCounts.flat || accidentalCounts.doubleFlat) {
      switch (accidentalCounts.flat + 2 * accidentalCounts.doubleFlat) {
        case 1: return 'F Major';
        case 2: return 'Bb Major';
        case 3: return 'Eb Major';
        case 4: return 'Ab Major';
        case 5: return 'Db Major';
        case 6: return 'Gb Major';
        case 7: return 'Cb Major';
        default:
            console.error(`No major equivalent found for scale: ${scale}`) 
            return null; // not a standard major scale
      }
    }
  
    return 'C Major'; // no accidentals
  }
  