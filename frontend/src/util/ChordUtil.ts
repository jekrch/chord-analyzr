import { MidiNumbers } from 'react-piano';
import { normalizeNoteName } from './NoteUtil';

// The order of natural notes within an octave
const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Converts a string of comma-separated chord notes into an array of note objects,
 * each with a note name and a calculated octave.
 * This ensures the notes form a smooth ascending sequence.
 *
 * @param {number} startOctave - The starting octave for the first note of the chord.
 * @param {number} endOctave - The maximum octave allowed.
 * @param {string} chordNoteNames - A string of comma-separated note names (e.g., "C, E, G").
 * @returns {{note: string, octave: number}[]} An array of note objects.
 */
export const getMidiNotes = (
  startOctave: number,
  endOctave: number,
  chordNoteNames: string
): { note: string; octave: number }[] => {
  
  const noteNames = chordNoteNames.split(', ');

  // Index of the first note in noteOrder to track note progression
  let previousNoteIndex = noteOrder.indexOf(normalizeNoteName(noteNames[0])![0]);
  let currentOctave = startOctave;

  return noteNames.map((noteName, index) => {
    const normalizedNote = normalizeNoteName(noteName)!;

    // Determine the position of the current note within a C-to-B octave cycle
    const noteIndex = noteOrder.indexOf(normalizedNote[0]);

    // If the current note is lower than the previous one (e.g., moving from G to C),
    // and it's not the very first note, we've crossed into the next octave.
    if (noteIndex < previousNoteIndex && index > 0) {
      currentOctave++;
    }

    // Ensure the octave does not exceed the specified maximum
    if (currentOctave > endOctave) {
      currentOctave = endOctave;
    }

    // Update the previous note index for the next iteration
    previousNoteIndex = noteIndex;

    // Return the note object with its name and calculated octave
    return { note: normalizedNote, octave: currentOctave };
  });
};