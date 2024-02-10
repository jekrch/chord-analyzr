import React, { useEffect, useRef, useState } from 'react';
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
import { ModeScaleChordDto } from './api';
import { SoundfontProvider } from './piano/SoundfontProvider';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import { getMidiNotes } from './util/ChordUtil';
import InstrumentListProvider from './piano/InstrumentListProvider';
import PianoConfig from './piano/PianoConfig';

function App() {
  const [refresh, setRefresh] = useState(0);
  const [chords, setChords] = useState<ModeScaleChordDto[]>();
  const [mode, setMode] = useState<string>('Dorian');
  const [error, setError] = useState(null);
  const [modes, setModes] = useState<string[] | undefined>();
  const notationRef = useRef<HTMLDivElement>(null);
  const tabNotationRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState('');
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const audioContext = useRef(new (window.AudioContext || window.AudioContext)());
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';

  const [pianoConfig, setPianoConfig] = useState<any>({
    instrumentName: 'acoustic_grand_piano',
    noteRange: {
      first: MidiNumbers.fromNote('c3'),
      last: MidiNumbers.fromNote('f5'),
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
    // First, clear the active notes
    setActiveNotes([]);

    // Use setTimeout to ensure the state has been cleared before setting new notes
    setTimeout(() => {
      let midiNumbers = getMidiNotes(
        startOctave, endOctave, chordNoteNames
      );
      setActiveNotes(midiNumbers);
    }, 10); // A minimal delay
  };

  useEffect(() => {
    ModeControllerService.getModes()
      .then((response) => {
        setModes(response.map(m => m.name!));
        setRefresh(Math.random());
        console.log(response);
      })
      .catch((err) => {
        setError(err);
        console.error('Error fetching modes:', err);
      });
  }, []);


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
        setError(err);
        console.error('Error fetching chords:', err);
      });

  }, [key, mode, notationRef]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="mb-2">
          <TextInput
            label="key"
            value={key}
            onChange={setKey}
          />

        </div>

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
            render={({ isLoading, playNote, stopNote, stopAllNotes }: { isLoading: any; playNote: any; stopNote: any, stopAllNotes: any }) => (
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
            )}
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
                  className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider z-10 bg-[#3d434f]"
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
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 text-left">{chord.chordName}</td>
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
