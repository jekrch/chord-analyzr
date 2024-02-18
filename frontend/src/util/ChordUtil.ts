import { MidiNumbers } from 'react-piano';
import { normalizeNoteName, normalizeNoteWithOctave } from './NoteUtil';

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

      noteName = normalizeNoteName(noteName)!;
      
      // determine the order of the current note within an octave cycle
      let noteIndex = noteOrder.indexOf(noteName[0]);

      // if the current note is before the previous in the natural note order and it's not the first note, increment octave
      if (noteIndex < previousNoteIndex && index > 0) {
        startOctave++;
      }

      // adjust the octave back down if it exceeds endOctave
      if (startOctave > endOctave) startOctave = endOctave;

      previousNoteIndex = noteIndex;

      // construct the full note name with octave for MIDI number conversion
      let fullNoteName = noteName + startOctave;
      
      return MidiNumbers.fromNote(fullNoteName);
    });
  };