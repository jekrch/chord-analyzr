import React, { useEffect, useMemo, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ChordControllerService } from './api/services/ChordControllerService';
import { ModeControllerService } from './api/services/ModeControllerService';
import { ModeDto } from './api/models/ModeDto';
import Dropdown from './components/Dropdown';
import Vex, { System } from 'vexflow';
import { Chord } from 'tonal'
import { Scale } from '@tonaljs/tonal';
import TextInput from './components/TextInput';
import { Glyph } from 'vexflow';
import { ModeScaleChordDto, ScaleControllerService, ScaleNoteDto } from './api';
import { SoundfontProvider } from './piano/SoundfontProvider';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import { getMidiNotes } from './util/ChordUtil';
import InstrumentListProvider from './piano/InstrumentListProvider';
import PianoConfig from './piano/PianoConfig';
import { EyeIcon, PlayCircleIcon } from '@heroicons/react/20/solid';
import classNames from 'classnames';
import { normalizeNoteName, normalizeNoteWithOctave } from './util/NoteUtil';
import { useModes } from './hooks/useModes';

function App() {
  const [refresh, setRefresh] = useState(0);
  const [chords, setChords] = useState<ModeScaleChordDto[]>();
  const [mode, setMode] = useState<string>('Dorian');
  // const [error, setError] = useState(null);
  const { modes, error } = useModes();
  const notationRef = useRef<HTMLDivElement>(null);
  const tabNotationRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState('');
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
  const audioContext = useRef(new (window.AudioContext || window.AudioContext)());
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const playNoteRef = useRef<(midiNumber: number) => void | null>(null);
  const stopNoteRef = useRef<(midiNumber: number) => void | null>(null);
  const stopAllNotesRef = useRef<() => void | null>(null);

  const normalizedScaleNotes = useMemo(() => {
    return scaleNotes.map(scaleNote => 
      normalizeNoteName(scaleNote?.noteName)
    );
  }, [scaleNotes]);
  
  const [pianoConfig, setPianoConfig] = useState<any>({
    instrumentName: 'acoustic_grand_piano',
    noteRange: {
      first: MidiNumbers.fromNote('c4'),
      last: MidiNumbers.fromNote('f6'),
    },
    keyboardShortcutOffset: 0,
  });

  /**
   * this specifies the first note's octave
   */
  const startOctave = 4;

  /**
   * the last notes octave
   */
  const endOctave = 6;

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

  const handleChordClick = (chordNoteNames: string) => {
    setActiveNotes([]);
    const midiNumbers = getMidiNotes(
      startOctave, endOctave, chordNoteNames
    );
    playNotes(midiNumbers);
  };

  const playNotes = (midiNumbers: number[]) => {
    // clear prev active notes
    setActiveNotes([]);
    stopAllNotesRef?.current?.();
    // Use setTimeout to ensure the state has been cleared before setting new notes
    setTimeout(() => {
      setActiveNotes(midiNumbers);
    }, 2); // minimal delay
  }


  const playScaleNotes = () => {
    if (!scaleNotes?.length) return;

    const noteDuration = 300; // Duration of each note in milliseconds
    let cumulativeDelay = 0;

    let scaleNotesFull = [...scaleNotes, {
      noteName: scaleNotes[0].noteName
    }]

    const startOctave = 4; // Starting octave for your keyboard range
    let currentOctave = startOctave;
    let lastOctaveIndex = 0;

    scaleNotesFull.forEach((scaleNote, index) => {
      setTimeout(() => {
        if (playNoteRef.current && stopNoteRef.current) {
          let noteName = scaleNote.noteName;
          
          noteName = normalizeNoteName(noteName);
          
          // increment the octave at every 'C', but not for the first note
          if (
            index > 0 && 
            noteName?.startsWith('C') &&
            (index - lastOctaveIndex) > 3  
          ) {
            lastOctaveIndex = index;
            currentOctave++;
          }
  
          noteName += currentOctave.toString();
  
          //noteName = normalizeNoteWithOctave(noteName);

          //console.log(`Playing note: ${noteName}`);
          let midiNumber = undefined;
          
          try{ 
            midiNumber = MidiNumbers.fromNote(noteName);
          } catch (ex) {
            console.error(`failed on ${noteName}`)
            return;
          }
          playNotes([midiNumber])
          // audioContext.current.resume().then(() => {
          //   (playNoteRef.current as any)?.(midiNumber);
          //   // Stop the note after its duration
          //   setTimeout(() => {
          //     (stopNoteRef.current as any)?.(midiNumber);
          //   }, noteDuration);
          // });
        }
      }, cumulativeDelay);
  
      cumulativeDelay += noteDuration;
    });
  
    // clear active notes after finishing the sequence
    setTimeout(() => setActiveNotes([]), cumulativeDelay + noteDuration);
  };


  const getChordNotes = (chordName: string) => {
    return Chord.get(chordName).notes; // Returns an array of note names
  };

  useEffect(() => {
    if (notationRef.current) {
      const notes = getChordNotes('C');
      console.log(notes)

      notationRef.current.innerHTML = '';
      const VF = Vex.Flow;
      const div = notationRef.current;
      const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

      renderer.resize(300, 200);
      const context = renderer.getContext();
      context.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

      const stave = new VF.Stave(10, 40, 400);
      stave.addClef("treble").addTimeSignature("4/4");
      stave.setContext(context).draw();

      const cMajorChord = new VF.StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "w" });

      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickables([cMajorChord]);

      const formatter = new VF.Formatter().joinVoices([voice]).format([voice], 400);
      voice.draw(context, stave);
    }
  }, []);

  useEffect(() => {

    if (!key?.length) {
      return;
    }

    ChordControllerService.getModeKeyChords(key, mode)
      .then((response) => {
        setChords(response);
      })
      .catch((err) => {
        console.error('Error fetching chords:', err);
      });

    ScaleControllerService.getScaleNotes(key, mode)
      .then((response) => {
        setScaleNotes(response);
      })
      .catch((err) => {
        console.error('Error fetching scale notes:', err);
      });

  }, [key, mode, notationRef]);

  
  return (
    <div className="App">
      <header className="App-header">
        <span className="mb-2">
          <span className="inline-block">
            <TextInput
              label="key"
              value={key?.toUpperCase()}
              onChange={setKey}
            />
          </span>

          <PlayCircleIcon
            onClick={playScaleNotes}
            height={30}
            className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer"
          />

        </span>

        {modes &&
          <Dropdown
            value={mode}
            className='w-auto min-w-[10em]'
            menuClassName='min-w-[10em]'
            onChange={(v) => { setMode(v) }}
            showSearch={true}
            options={modes}
          />
        }

        {/* Piano component */}
        <div className="mt-4">
          <SoundfontProvider
            instrumentName={pianoConfig.instrumentName}
            audioContext={audioContext.current}
            hostname={soundfontHostname}
            render={({ isLoading, playNote, stopNote, stopAllNotes }: { isLoading: any; playNote: any; stopNote: any, stopAllNotes: any }) => {

              (playNoteRef.current as any) = playNote;
              (stopNoteRef.current as any) = stopNote;
              (stopAllNotesRef.current as any) = stopAllNotes;

              return (
                <>
                  <Piano
                    noteRange={{
                      first: MidiNumbers.fromNote(firstNoteName),
                      last: MidiNumbers.fromNote(lastNoteName)
                    }
                    }
                    playNote={playNote}
                    stopNote={stopNote}
                    disabled={isLoading}
                    width={500}
                    activeNotes={activeNotes}
                    // renderNoteLabel={(key: any) => {
                    //   console.log(key.midiNumber)
                    //   return (
                    //     <div className="mx-auto mb-2 w-2 bg-blue-400 h-2"/>
                    //   )
                    // }}
                    renderNoteLabel={({ midiNumber, isAccidental }: { midiNumber: number; isAccidental: boolean }) => {
                      // convert the midiNumber to a note name without the octave
                      const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
                    
                      // check if this note (without considering the octave) is in the scale
                      const isScaleNote = normalizedScaleNotes.includes(
                        normalizeNoteName(noteNameWithoutOctave)
                      );
                                        
                      // conditionally render your label with a visual indicator for scale notes
                      if (isScaleNote) {
                        return (
                          <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-200' : 'bg-blue-400'}`} />
                        );
                      }
                    
                      // Optionally, handle rendering for non-scale notes
                      return null; // or any other default rendering for non-scale notes
                    }}
                  //keyboardShortcuts={keyboardShortcuts}
                  />
                  <div className="row mt-5">
                    <div className="col-lg-8 offset-lg-2">
                      <InstrumentListProvider
                        hostname={soundfontHostname}
                        render={(instrumentList) => (
                          <PianoConfig
                            config={pianoConfig}
                            setConfig={(config) => {
                              setPianoConfig(
                                Object.assign({}, pianoConfig, config),
                              );
                              stopAllNotes?.();
                            }}
                            instrumentList={instrumentList || [pianoConfig.instrumentName]}
                            keyboardShortcuts={keyboardShortcuts}
                          />
                        )}
                      />
                    </div>
                  </div>
                </>
              )
            }}
          />

        </div>
        {/* <div className="mt-[2em]">
          <div className="rounded-xl bg-white shadow-sm shadow-slate-500" ref={notationRef} />
        </div> */}
        {/* <div className="bg-white mt-[2em]">
          <div className="" ref={tabNotationRef} />
        </div> */}

        <div className="mt-4 relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#3d434f]">
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 px-2 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
                >
                </th>
                <th
                  scope="col"
                  className="sticky top-0 pl-7 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="sticky top-0 pl-0 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
                >
                  Notes
                </th>
              </tr>
            </thead>
          </table>
          <div className="divide-y divide-gray-200 overflow-auto" style={{ maxHeight: '10em' }}>
            <table className="min-w-full bg-[#444b59]">
              <tbody className="divide-y divide-gray-200">
                {chords?.map((chord: ModeScaleChordDto, index: number) => (
                  <tr key={`chord-${index}`}>
                    <td
                      onClick={() => {
                        handleChordClick(chord.chordNoteNames!)
                      }}
                      className="px-2 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                      <span>
                        <PlayCircleIcon height={30} className="inline-block ml-2 hover:text-slate-400 active:text-slate-500 cursor-pointer" />

                      </span>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">
                      {chord.chordName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-left">{chord.chordNoteNames}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
