import { MidiNumbers } from 'react-piano';

// the order of notes within an octave
const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B']; 

export const getMidiNotes = (
    startOctave: number, 
    endOctave: number,
    chordNoteNames: string
): number[] => {
    
    const noteNames = chordNoteNames.split(', ');
    
    // index of the first note in noteOrder
    let previousNoteIndex = noteOrder.indexOf(noteNames[0][0]); 

    return noteNames.map((noteName, index) => {
      // Determine the order of the current note within an octave cycle
      let noteIndex = noteOrder.indexOf(noteName[0]);

      // If the current note is before the previous in the natural note order and it's not the first note, increment octave
      if (noteIndex < previousNoteIndex && index > 0) {
        startOctave++;
      }

      // Adjust the octave back down if it exceeds endOctave
      if (startOctave > endOctave) startOctave = endOctave;

      previousNoteIndex = noteIndex;

      // Construct the full note name with octave for MIDI number conversion
      const fullNoteName = noteName + startOctave;
      return MidiNumbers.fromNote(fullNoteName);
    });
  };