import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { ChordControllerService } from './api/services/ChordControllerService';
import Dropdown from './components/Dropdown';
import Vex, { System } from 'vexflow';
import TextInput from './components/TextInput';
import { Glyph } from 'vexflow';
import { ModeScaleChordDto, ScaleControllerService, ScaleNoteDto } from './api';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import { getMidiNotes } from './util/ChordUtil';
import { PlayCircleIcon } from '@heroicons/react/20/solid';
import { normalizeNoteName } from './util/NoteUtil';
import { useModes } from './hooks/useModes';
import ChordTable from './components/ChordTable';
import PianoControl, { endOctave, startOctave } from './components/piano/PianoControl';
import StaffVisualizer from './components/StaffVisualizer';
import classNames from 'classnames';

interface AddedChord {
  name: string;
  notes: string;
}

function App() {
  const [chords, setChords] = useState<ModeScaleChordDto[]>();
  const [mode, setMode] = useState<string>('Ionian');
  const { modes, error } = useModes();
  const [key, setKey] = useState('C');
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [scaleNotes, setScaleNotes] = useState<ScaleNoteDto[]>([]);
  const [addedChords, setAddedChords] = useState<AddedChord[]>([]);
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);

  const normalizedScaleNotes: string[] = useMemo(() => {
    if (!scaleNotes.length) {
      return [];
    }
    return scaleNotes.map(scaleNote =>
      normalizeNoteName(scaleNote?.noteName)!
    );
  }, [scaleNotes]);

  const addChordClick = (chordName: string, chordNotes: string) => {
    setAddedChords(current => [...current, { name: chordName, notes: chordNotes }]);
  };

  const handleChordClick = (chordNoteNames: string) => {
    //setActiveNotes([]);
    const midiNumbers = getMidiNotes(
      startOctave, endOctave, chordNoteNames
    );
    playNotes(midiNumbers);
  };

  const playNotes = (midiNumbers: number[]) => {
    setActiveNotes([]);
    // use setTimeout to ensure the state has been cleared before setting new notes
    setTimeout(() => {
      setActiveNotes(midiNumbers);
    }, 2); // minimal delay
  }

  const playScaleNotes = () => {

    if (!scaleNotes?.length) return;

    const noteDuration = 300; // duration of each note in milliseconds
    let cumulativeDelay = 0;

    let scaleNotesFull = [...scaleNotes, {
      noteName: scaleNotes[0].noteName
    }]

    // start octave for keyboard range
    const startOctave = 4;
    let currentOctave = startOctave;

    let lastMidiNumber = 0;

    scaleNotesFull.forEach((scaleNote, index) => {
      setTimeout(() => {

        let noteName = scaleNote.noteName;

        noteName = normalizeNoteName(noteName);
        noteName += currentOctave.toString();

        //console.log(`Playing note: ${noteName}`);
        let midiNumber = MidiNumbers.fromNote(noteName);

        // if the note is below the previous, increment the octave
        if (midiNumber < lastMidiNumber) {
          midiNumber += 12;
          currentOctave++;
        }

        lastMidiNumber = midiNumber;
        setActiveNotes([]);

        playNotes([midiNumber])
        // audioContext.current.resume().then(() => {
        //   (playNoteRef.current as any)?.(midiNumber);
        //   // stop the note after its duration
        //   setTimeout(() => {
        //     (stopNoteRef.current as any)?.(midiNumber);
        //   }, noteDuration);
        // });

      }, cumulativeDelay);

      cumulativeDelay += noteDuration;
    });

    // clear active notes after finishing the sequence
    setTimeout(() => setActiveNotes([]), cumulativeDelay + noteDuration);
  };

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

  }, [key, mode]);

  const handleKeyPress = (event: KeyboardEvent) => {
    const keyMapIndex = event.key === '0' ? 9 : parseInt(event.key, 10) - 1;
    if (keyMapIndex >= 0 && keyMapIndex < addedChords.length) {
      
      // mark the chord as active
      setActiveChordIndex(keyMapIndex);
      const chordToPlay = addedChords[keyMapIndex];
      
      if (chordToPlay) {
        //console.log(`Playing chord: ${chordToPlay.name}`);
        handleChordClick(chordToPlay.notes);
  
        // reset active chord index after playing
        setTimeout(() => {
          setActiveChordIndex(null);
        }, 200); 
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [addedChords, handleChordClick]); 


  return (
    <div className="App">
      <div className="App-body">
        <span className="mb-2">
          <span className="inline-block">
            <TextInput
              label="key"
              value={key ? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase() : ''}
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

        <div className="mt-4">
          <PianoControl
            activeNotes={activeNotes}
            normalizedScaleNotes={normalizedScaleNotes ?? []}
          />
        </div>
        {/* 
        <StaffVisualizer 
          notes={chordNotes} 
        /> */}

        {/* added chords */}
        <div className={classNames({'mt-6' : addedChords?.length})}>
          {addedChords.map((chord, index) => (
            <button
              key={index}
              className={`mr-2 mb-2 py-2 px-4 rounded-full text-white font-bold text-[0.7em] ${
                index === activeChordIndex ? 'bg-cyan-500' : 'bg-cyan-700 hover:bg-cyan-600'
              }`}
              onClick={() => {
                setActiveChordIndex(index);
                handleChordClick(chord.notes);
                setTimeout(() => {
                  setActiveChordIndex(null);
                }, 200); // Reset active chord index
              }}
            >
              {chord.name}
            </button>
          ))}
          {addedChords?.length != 0 &&
              <button
              key={'clear'}
              className="mr-2 mb-2 bg-gray-500 hover:bg-gray-700 text-white text-[0.7em] font-bold py-2 px-3 rounded-full"
              onClick={() => setAddedChords([])}
            >
              clear
            </button>
          }
        </div>

        <ChordTable
          chords={chords}
          onChordClick={handleChordClick}
          addChordClick={addChordClick}
        />
      </div>
    </div>
  );
}

export default App;
