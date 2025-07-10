import React, { useEffect, useMemo, useRef, useState } from 'react';
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

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

// Restored the export for use in other components
export const startOctave = 4;
export const endOctave = 7;

const PianoControl: React.FC<PianoProps> = ({
  activeNotes,
  normalizedScaleNotes
}) => {
  const audioContext = useRef(new (window.AudioContext || window.AudioContext)());
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);

  // --- Settings State ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cutOffPreviousNotes, setCutOffPreviousNotes] = useState<boolean>(false);
  const [eq, setEq] = useState<EqSettings>({ bass: 0, mid: 0, treble: 0 });
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [reverbLevel, setReverbLevel] = useState(0.0);

  // --- Recalculate piano range based on octave offset ---
  const { firstNote, lastNote, keyboardShortcuts } = useMemo(() => {
    const currentStartOctave = startOctave + octaveOffset;
    const currentEndOctave = endOctave + octaveOffset;
    const anchorNote = 'c';
    
    // Prevent invalid octave ranges
    if (currentStartOctave < 1 || currentEndOctave > 8 || currentStartOctave >= currentEndOctave) {
        return {
            firstNote: MidiNumbers.fromNote(`${anchorNote}${startOctave}`),
            lastNote: MidiNumbers.fromNote(`${anchorNote}${endOctave}`),
            keyboardShortcuts: KeyboardShortcuts.create({
                firstNote: MidiNumbers.fromNote(`${anchorNote}${startOctave}`),
                lastNote: MidiNumbers.fromNote(`${anchorNote}${endOctave}`),
                keyboardConfig: KeyboardShortcuts.HOME_ROW,
            })
        };
    }
    
    const firstNoteName = `${anchorNote}${currentStartOctave}`;
    const lastNoteName = `${anchorNote}${currentEndOctave}`;
    const firstNote = MidiNumbers.fromNote(firstNoteName);
    const lastNote = MidiNumbers.fromNote(lastNoteName);

    return {
      firstNote,
      lastNote,
      keyboardShortcuts: KeyboardShortcuts.create({
        firstNote,
        lastNote,
        keyboardConfig: KeyboardShortcuts.HOME_ROW,
      }),
    };
  }, [octaveOffset]);

  const [pianoConfig, setPianoConfig] = useState<any>({
    instrumentName: 'acoustic_grand_piano',
  });

  useEffect(() => {
    if (cutOffPreviousNotes && stopAllNotesRef.current) {
        stopAllNotesRef.current();
    }
    setActivePianoNotes(activeNotes);
  }, [activeNotes]);

  const handleEqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEq(prevEq => ({ ...prevEq, [name]: parseFloat(value) }));
  };

  return (
    <SoundfontProvider
      instrumentName={pianoConfig.instrumentName}
      audioContext={audioContext.current}
      hostname={soundfontHostname}
      eq={eq}
      reverbLevel={reverbLevel}
      render={({ isLoading, playNote, stopNote, stopAllNotes }) => {
        stopAllNotesRef.current = stopAllNotes;

        return (<>
          <div className="relative">
            <Piano
              noteRange={{ first: firstNote, last: lastNote }}
              playNote={playNote}
              stopNote={stopNote}
              disabled={isLoading}
              width={500}
              activeNotes={activePianoNotes}
              renderNoteLabel={({ midiNumber, isAccidental }:any) => {
                const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
                const isScaleNote = normalizedScaleNotes.includes(normalizeNoteName(noteNameWithoutOctave)!);
                if (isScaleNote) {
                  return <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-200' : 'bg-blue-400'}`} />;
                }
                return null;
              }}
            />
             {/* --- Settings Button --- */}
            <div className="absolute top-2 right-0 -mr-12">
                 <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 ${
                      settingsOpen 
                        ? 'bg-gray-600 border-gray-500 text-gray-200' 
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:border-gray-500 hover:text-gray-200'
                    }`}
                    aria-label="Sound Settings"
                    aria-expanded={settingsOpen}
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                  </button>
            </div>
          </div>
         
          {/* --- Settings Panel --- */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            settingsOpen ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}>
            <div className="bg-black-700 border border-gray-700 rounded-lg p-4 w-[400px] mx-auto">
              <div className="space-y-4">
                
                {/* Octave Control */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Octave</label>
                  <div className="flex items-center justify-between bg-gray-700 border border-gray-600 rounded-md p-1.5">
                    <button 
                      onClick={() => setOctaveOffset(o => Math.max(-2, o - 1))} 
                      className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 rounded transition-colors"
                      disabled={octaveOffset <= -2}
                    >
                      −
                    </button>
                    <span className="font-mono text-xs text-gray-200 px-2">
                      C{startOctave + octaveOffset} to C{endOctave + octaveOffset}
                    </span>
                    <button 
                      onClick={() => setOctaveOffset(o => Math.min(2, o + 1))} 
                      className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 rounded transition-colors"
                      disabled={octaveOffset >= 2}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Reverb Control */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Reverb
                    <span className="text-xs text-gray-400 ml-2">({Math.round(reverbLevel * 100)}%)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="range" 
                      min="0" 
                      max="0.7" 
                      step="0.05" 
                      value={reverbLevel} 
                      onChange={(e) => setReverbLevel(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                </div>

                {/* Note Cutoff */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1" 
                      checked={cutOffPreviousNotes} 
                      onChange={(e) => setCutOffPreviousNotes(e.target.checked)} 
                    />
                    <span className="ml-2 text-xs text-gray-300">Stop notes on new input</span>
                  </label>
                </div>

                {/* Equalizer */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Equalizer</label>
                  <div className="space-y-3">
                    {[
                      { label: 'Bass', key: 'bass' as keyof EqSettings },
                      { label: 'Mid', key: 'mid' as keyof EqSettings },
                      { label: 'Treble', key: 'treble' as keyof EqSettings }
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className="text-xs text-gray-400 font-mono">
                            {eq[key] > 0 ? '+' : ''}{eq[key].toFixed(1)}dB
                          </span>
                        </div>
                        <input 
                          type="range" 
                          name={key}
                          min="-24" 
                          max="24" 
                          step="0.5" 
                          value={eq[key]} 
                          onChange={handleEqChange}
                          className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer slider-thumb"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-5">
            <InstrumentListProvider
              hostname={soundfontHostname}
              render={(instrumentList) => (
                <PianoConfig
                  config={pianoConfig}
                  setConfig={setPianoConfig}
                  instrumentList={instrumentList || [pianoConfig.instrumentName]}
                  keyboardShortcuts={keyboardShortcuts}
                />
              )}
            />
          </div>

     
        </>)
      }}
    />
  );
};

export default PianoControl;