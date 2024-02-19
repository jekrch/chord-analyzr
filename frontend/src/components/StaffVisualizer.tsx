import React, { useEffect, useRef } from 'react';
import { Chord } from 'tonal';
import Vex from 'vexflow';

interface StaffVisualizerProps {
  notes: string[]; // notes are strings like ["c/4", "e/4", "g/4"]
}

const StaffVisualizer: React.FC<StaffVisualizerProps> = ({ notes }) => {
  const notationRef = useRef<HTMLDivElement>(null);

  const getChordNotes = (chordName: string) => {
    return Chord.get(chordName).notes; 
  };

  useEffect(() => {
    if (notationRef.current) {
      const notes = getChordNotes('Cm9').map(s => { return s + '/4'});
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

      //const cMajorChord = new VF.StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "w" });
      const cMajorChord = new VF.StaveNote({ keys: notes, duration: "w" });
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickables([cMajorChord]);

      const formatter = new VF.Formatter().joinVoices([voice]).format([voice], 400);
      voice.draw(context, stave);
    }
  }, []);

  return (
    <div className="mt-[2em]">
          <div className="rounded-xl bg-white shadow-sm shadow-slate-500" ref={notationRef} />
    </div>
  );
};

export default StaffVisualizer;
