import React, { useEffect, useRef, useState } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import InstrumentListProvider from '../../piano/InstrumentListProvider';
import PianoConfig from '../../piano/PianoConfig';
import { SoundfontProvider } from '../../piano/SoundfontProvider';
import { normalizeNoteName } from '../../util/NoteUtil';
import { request } from '../../api/core/request';

interface PianoProps {
  activeNotes: number[];
  normalizedScaleNotes: string[];
}

/**
* this specifies the first note's octave
*/
export const startOctave = 4;

/**
 * the last notes octave
 */
export const endOctave = 7;

const PianoControl: React.FC<PianoProps> = ({
  activeNotes,
  normalizedScaleNotes
}) => {

  const audioContext = useRef(new (window.AudioContext || window.AudioContext)());
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  // const playNoteRef = useRef<(midiNumber: number) => void | null>(null);
  const stopNoteRef = useRef<((midiNumber: number) => void) | null>(null);
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([])

  /**
   * first and last note letter
   */
  const anchorNote = 'c';

  const firstNoteName = `${anchorNote}${startOctave}`;
  const lastNoteName = `${anchorNote}${endOctave}`;

  const firstNote = MidiNumbers.fromNote(firstNoteName);
  const lastNote = MidiNumbers.fromNote(lastNoteName);

  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: firstNote,
    lastNote: lastNote,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

  const [pianoConfig, setPianoConfig] = useState<any>({
    instrumentName: 'acoustic_grand_piano',
    noteRange: {
      first: firstNote,
      last: lastNote,
    },
    keyboardShortcutOffset: 0,
  });

  useEffect(() => {
    
    setActivePianoNotes([]);
    setActivePianoNotes(activeNotes);
  }, [activeNotes]);

  return (
    <SoundfontProvider
      instrumentName={pianoConfig.instrumentName}
      audioContext={audioContext.current}
      hostname={soundfontHostname}
      render={({ isLoading, playNote, stopNote, stopAllNotes }: { isLoading: boolean; playNote: any; stopNote: any, stopAllNotes: any }) => {

        // (playNote.current as any) = playNote;
        stopNoteRef.current = stopNote;
        //stopAllNotesRef.current = stopAllNotes;
        return (<>
          <Piano
            noteRange={{
              first: MidiNumbers.fromNote(firstNoteName),
              last: MidiNumbers.fromNote(lastNoteName)
            }}
            playNote={playNote}
            stopNote={stopNote}          
            disabled={isLoading}
            width={500}
            activeNotes={activePianoNotes}
            renderNoteLabel={({ midiNumber, isAccidental }: { midiNumber: number; isAccidental: boolean }) => {
              const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
              const isScaleNote = normalizedScaleNotes.includes(
                normalizeNoteName(noteNameWithoutOctave)!
              );
              if (isScaleNote) {
                return (
                  <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-200' : 'bg-blue-400'}`} />
                );
              }
              return null;
            }}
          />
          <div className="mt-5">
            <InstrumentListProvider
              hostname={soundfontHostname}
              render={(instrumentList) => (
                <PianoConfig
                  config={pianoConfig}
                  setConfig={setPianoConfig}
                  instrumentList={instrumentList || [pianoConfig.instrumentName]}
                  keyboardShortcuts={KeyboardShortcuts.create({
                    firstNote: firstNote,
                    lastNote: lastNote,
                    keyboardConfig: KeyboardShortcuts.HOME_ROW,
                  })}
                />
              )}
            />
          </div>
        </>
        )
      }}
    />
  );
};

export default PianoControl;
