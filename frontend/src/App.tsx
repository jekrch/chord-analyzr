import React, { useEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ChordControllerService } from './api/services/ChordControllerService';
import { ModeControllerService } from './api/services/ModeControllerService';
import { ModeDto } from './api/models/ModeDto';
import Dropdown from './components/Dropdown';
import Vex from 'vexflow';
import { Chord } from 'tonal'

function App() {
  const [refresh, setRefresh] = useState(0);
  const [chords, setChords] = useState(null);
  const [selectedMode, setSelectedMode] = useState<string>('Dorian');
  const [error, setError] = useState(null);
  const [modes, setModes] = useState<string[] | undefined>();
  const notationRef = useRef<HTMLDivElement>(null);
  const tabNotationRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    ChordControllerService.getChords()
      .then((response) => {
        setChords(response.data);
      })
      .catch((err) => {
        setError(err);
        console.error('Error fetching chords:', err);
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
        if (tabNotationRef.current) {
          tabNotationRef.current.innerHTML = '';
            const VF = Vex.Flow;
            const div = tabNotationRef.current;
            const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

            renderer.resize(400, 250);
            const context = renderer.getContext();
            context.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

            const stave = new VF.Stave(10, 40, 400);
            stave.addClef("treble").addTimeSignature("4/4");
            stave.setContext(context).draw();

            // tab
            const tabStave = new VF.TabStave(10, 100, 400);
            tabStave.addClef("tab").setContext(context).draw();

            const cMajorChord = new VF.StaveNote({
                keys: ["c/4", "e/4", "g/4"],
                duration: "w"
            });

            // Chord for guitar tablature
            const cMajorChordTab = new VF.TabNote({
                positions: [{str: 5, fret: 3}, {str: 4, fret: 2}, {str: 3, fret: 0}], // C Major chord positions
                duration: "w"
            });

            // Create voices and add notes
            const voice = new VF.Voice({num_beats: 4, beat_value: 4}).addTickables([cMajorChord]);
            const tabVoice = new VF.Voice({num_beats: 4, beat_value: 4}).addTickables([cMajorChordTab]);

            // Format and justify the notes to 400 pixels
            new VF.Formatter().joinVoices([voice]).format([voice], 400);
            new VF.Formatter().joinVoices([tabVoice]).format([tabVoice], 400);

            // Render voices
            voice.draw(context, stave);
            tabVoice.draw(context, tabStave);
        }
    }, []);


  return (
    <div className="App">
      <header className="App-header">
        {modes &&
          <Dropdown
            value={selectedMode}
            className='w-auto min-w-[10em]'
            menuClassName='min-w-[10em]'
            onChange={(v) => { setSelectedMode(v) }}
            showSearch={true}
            options={modes}
          />
        }
        <div className="bg-white mt-[2em]">
          <div className="" ref={notationRef} />
        </div>
        <div className="bg-white mt-[2em]">
          <div className="" ref={tabNotationRef} />
        </div>
        <p key={`modes=${refresh}`}>


          {/* {modes?.map((mode: string, index: number) => (
            <div 
              key={`mode-${index}`}
              className="text-slate-200"
            >
                {mode}
              </div>
          ))} */}
        </p>

      </header>
    </div>
  );
}

export default App;
