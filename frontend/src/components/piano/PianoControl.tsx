import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import InstrumentListProvider from '../../piano/InstrumentListProvider';
import PianoConfig from '../../piano/PianoConfig';
import { SoundfontProvider } from '../../piano/SoundfontProvider';
import { normalizeNoteName } from '../../util/NoteUtil';

// --- FIX ---
// Create the AudioContext ONCE, outside the component.
// This ensures the same instance is reused across re-renders and prevents exceeding the browser limit.
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

interface ChordPattern {
  pattern: string[];
  enabled: boolean;
}

interface PianoProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  activeChordIndex: number | null;
  addedChords: { name: string; notes: string }[];
  globalPatternState: {
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  };
  onPatternStateChange: (updates: Partial<{
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    isPlaying: boolean;
    bpm: number;
    subdivision: number;
    swing: number;
    currentStep: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  }>) => void;
}

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

export const startOctave = 4;
export const endOctave = 7;

const PianoControl: React.FC<PianoProps> = ({
  activeNotes,
  normalizedScaleNotes,
  activeChordIndex,
  addedChords,
  globalPatternState,
  onPatternStateChange
}) => {
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  const lastStepRef = useRef<number>(-1);
  const chordSustainTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Settings State
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [cutOffPreviousNotes, setCutOffPreviousNotes] = useState<boolean>(true);
  const [eq, setEq] = useState<EqSettings>({ bass: 0, mid: 0, treble: 0 });
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [reverbLevel, setReverbLevel] = useState<number>(0.0);
  const [noteDuration, setNoteDuration] = useState<number>(0.8);

  const { firstNote, lastNote, keyboardShortcuts, midiOffset } = useMemo(() => {
    const anchorNote = 'c';
    const firstNote = MidiNumbers.fromNote(`${anchorNote}${startOctave}`);
    const lastNote = MidiNumbers.fromNote(`${anchorNote}${endOctave}`);
    const midiOffset = octaveOffset * 12;

    return {
      firstNote,
      lastNote,
      midiOffset,
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

  // Simple chord playing when sequencer is OFF
  useEffect(() => {
    // Clear any existing timeout
    if (chordSustainTimeoutRef.current) {
      clearTimeout(chordSustainTimeoutRef.current);
      chordSustainTimeoutRef.current = null;
    }

    if (!globalPatternState.isPlaying && activeNotes.length > 0) {
      // Play all notes as a chord
      const chordMidiNotes = activeNotes.map(({ note, octave = 4 }) =>
        MidiNumbers.fromNote(`${note}${octave}`)
      );
      setActivePianoNotes(chordMidiNotes);
      
      // Auto-release after 2 seconds
      chordSustainTimeoutRef.current = setTimeout(() => {
        if (!globalPatternState.isPlaying) {
          setActivePianoNotes([]);
        }
      }, 2000);
    } else if (!globalPatternState.isPlaying && activeNotes.length === 0) {
      setActivePianoNotes([]);
    }

    return () => {
      if (chordSustainTimeoutRef.current) {
        clearTimeout(chordSustainTimeoutRef.current);
        chordSustainTimeoutRef.current = null;
      }
    };
  }, [activeNotes, globalPatternState.isPlaying]);

  // Get current active pattern (default or chord-specific)
  const getCurrentPattern = useCallback(() => {
    if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
      return globalPatternState.chordPatterns[activeChordIndex].pattern;
    }
    return globalPatternState.defaultPattern;
  }, [activeChordIndex, globalPatternState.chordPatterns, globalPatternState.defaultPattern]);

  // Parse pattern step (handle rests and octave notation)
  const parsePatternStep = useCallback((step: string, noteCount: number) => {
    if (step === 'x' || step === 'X') return null; // Rest
    
    const isOctaveUp = step.includes('+');
    const isOctaveDown = step.includes('-');
    const noteIndex = parseInt(step.replace(/[+-]/g, '')) - 1;
    
    if (noteIndex >= 0 && noteIndex < noteCount) {
      return { 
        noteIndex, 
        octaveUp: isOctaveUp,
        octaveDown: isOctaveDown 
      };
    }
    return null;
  }, []);

  const getStepDuration = useCallback(() => {
    const quarterNoteDuration = 60000 / globalPatternState.bpm;
    return quarterNoteDuration * globalPatternState.subdivision;
  }, [globalPatternState.bpm, globalPatternState.subdivision]);

  // Handle pattern playback when sequencer is ON
  useEffect(() => {
    const currentPattern = getCurrentPattern();
    
    if (globalPatternState.isPlaying && 
        activeNotes.length > 0 && 
        currentPattern.length > 0 &&
        globalPatternState.currentStep !== lastStepRef.current) {
      
      lastStepRef.current = globalPatternState.currentStep;
      
      const currentPatternIndex = globalPatternState.currentStep % currentPattern.length;
      const stepValue = currentPattern[currentPatternIndex];
      const parsedStep = parsePatternStep(stepValue, activeNotes.length);
      
      if (parsedStep) {
        const { noteIndex, octaveUp, octaveDown } = parsedStep;
        const { note, octave = 4 } = activeNotes[noteIndex];
        let finalOctave = octave;
        
        if (octaveUp) finalOctave += 1;
        if (octaveDown) finalOctave -= 1;
        
        // Ensure octave stays within reasonable bounds
        finalOctave = Math.max(1, Math.min(8, finalOctave));
        
        const midiNote = MidiNumbers.fromNote(`${note}${finalOctave}`);
        
        if (!cutOffPreviousNotes && stopAllNotesRef.current) {
          stopAllNotesRef.current();
        }
        
        setActivePianoNotes([midiNote]);
        
        const stepDuration = getStepDuration();
        const sustainDuration = Math.min(stepDuration * noteDuration, stepDuration - 50);
        
        setTimeout(() => {
          setActivePianoNotes([]);
        }, sustainDuration);
      } else {
        // Rest - clear any active notes
        setActivePianoNotes([]);
      }
    } else if (!globalPatternState.isPlaying) {
      // When pattern stops, clear sequencer notes but let chord playing handle the rest
      if (lastStepRef.current !== -1) {
        setActivePianoNotes([]);
        lastStepRef.current = -1;
      }
    }
  }, [
    globalPatternState.currentStep,
    globalPatternState.isPlaying,
    activeNotes,
    cutOffPreviousNotes,
    noteDuration,
    getStepDuration,
    getCurrentPattern,
    parsePatternStep
  ]);

  const handleEqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEq(prevEq => ({ ...prevEq, [name]: parseFloat(value) }));
  };

  const playNoteWithOffset = (playNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      if (!cutOffPreviousNotes && stopAllNotesRef.current) {
        stopAllNotesRef.current();
      }
      playNote(midiNumber + midiOffset);
    };

  const stopNoteWithOffset = (stopNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      stopNote(midiNumber + midiOffset);
    };

  if (!audioContext) {
    return <div>Audio context is not available.</div>;
  }

  return (
    <SoundfontProvider
      instrumentName={pianoConfig.instrumentName}
      audioContext={audioContext}
      hostname={soundfontHostname}
      eq={eq}
      reverbLevel={reverbLevel}
      render={({ isLoading, playNote, stopNote, stopAllNotes }) => {
        stopAllNotesRef.current = stopAllNotes;
        const currentPattern = getCurrentPattern();

        return (<>
          <div className="relative w-max mx-auto">
            <Piano
              noteRange={{ first: firstNote, last: lastNote }}
              playNote={playNoteWithOffset(playNote)}
              stopNote={stopNoteWithOffset(stopNote)}
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
            
            {globalPatternState.isPlaying && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50">
                <div className="flex items-center space-x-3 bg-green-900 bg-opacity-95 px-4 py-2 rounded-full border border-green-600 shadow-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300 font-medium">
                    Step {(globalPatternState.currentStep % currentPattern.length) + 1}/{currentPattern.length}
                  </span>
                  <span className="text-xs text-green-400 font-mono">
                    {currentPattern.join('-')}
                  </span>
                  {activeChordIndex !== null && (
                    <span className="text-xs text-green-200">
                      {addedChords[activeChordIndex]?.name}
                    </span>
                  )}
                  <span className="text-xs text-green-400 font-mono">
                    {globalPatternState.bpm} BPM
                  </span>
                </div>
              </div>
            )}

            <div className="absolute top-2 right-0 -mr-12">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 ${
                    settingsOpen
                      ? 'bg-[#4a5262] border-gray-600 text-slate-200'
                      : 'bg-[#3d434f] border-gray-600 text-slate-400 hover:bg-[#4a5262] hover:border-gray-500 hover:text-slate-200'
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            settingsOpen ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0'
          } mx-4`}>
            <div className="bg-[#3d434f] border border-gray-600 rounded-lg overflow-hidden w-[600px]x mx-auto">
              <div className="px-4 py-3 border-b border-gray-600">
                <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
                  Piano Settings
                </h3>
              </div>

              <div className="p-6 bg-[#444b59]">
                <div className="grid grid-cols-2 gap-x-8">

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Octave Shift</label>
                      <div className="flex items-center justify-between bg-[#3d434f] border border-gray-600 rounded-md p-1.5">
                        <button onClick={() => setOctaveOffset(o => Math.max(-3, o - 1))} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors" disabled={octaveOffset <= -3}>−</button>
                        <span className="font-mono text-xs text-slate-200 px-2">{octaveOffset === 0 ? 'Normal' : `${octaveOffset > 0 ? '+' : ''}${octaveOffset} octave${Math.abs(octaveOffset) > 1 ? 's' : ''}`}</span>
                        <button onClick={() => setOctaveOffset(o => Math.min(3, o + 1))} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-200 hover:bg-[#4a5262] rounded transition-colors" disabled={octaveOffset >= 3}>+</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                        Reverb<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(reverbLevel * 100)}%)</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="range" 
                          min="0" 
                          max="1.0" 
                          step="0.05" 
                          value={reverbLevel} 
                          onChange={(e) => setReverbLevel(parseFloat(e.target.value))} 
                          className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">
                        Note Duration<span className="text-xs text-slate-400 ml-2 normal-case">({Math.round(noteDuration * 100)}%)</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="range" 
                          min="0.1" 
                          max="1.0" 
                          step="0.05" 
                          value={noteDuration} 
                          onChange={(e) => setNoteDuration(parseFloat(e.target.value))} 
                          className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-blue-600 bg-[#3d434f] border-gray-600 rounded focus:ring-blue-500 focus:ring-1" 
                          checked={cutOffPreviousNotes} 
                          onChange={(e) => setCutOffPreviousNotes(e.target.checked)} 
                        />
                        <span className="ml-2 text-xs text-slate-300 uppercase tracking-wide">Cut off previous notes</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Equalizer</label>
                      <div className="space-y-3">
                        {[
                          { label: 'Bass', key: 'bass' as keyof EqSettings },
                          { label: 'Mid', key: 'mid' as keyof EqSettings },
                          { label: 'Treble', key: 'treble' as keyof EqSettings }
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
                              <span className="text-xs text-slate-400 font-mono">{eq[key] > 0 ? '+' : ''}{eq[key].toFixed(1)}dB</span>
                            </div>
                            <input 
                              type="range" 
                              name={key} 
                              min="-24" 
                              max="24" 
                              step="0.5" 
                              value={eq[key]} 
                              onChange={handleEqChange} 
                              className="w-full h-1.5 bg-[#3d434f] rounded appearance-none cursor-pointer slider-thumb" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* <div>
                      <label className="block text-xs font-medium text-slate-200 mb-2 uppercase tracking-wide">Sequencer Quick Controls</label>
                      <div className="space-y-2">
                        <button
                          onClick={() => onPatternStateChange({
                            isPlaying: !globalPatternState.isPlaying,
                            lastChordChangeTime: Date.now()
                          })}
                          className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors uppercase tracking-wide ${
                            globalPatternState.isPlaying
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {globalPatternState.isPlaying ? 'Stop Sequencer' : 'Start Sequencer'}
                        </button>
                        <button
                          onClick={() => onPatternStateChange({
                            currentStep: 0
                          })}
                          className="w-full py-2 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium uppercase tracking-wide transition-colors"
                        >
                          Reset to Step 1
                        </button>
                      </div>
                    </div> */}

                    {/* <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-600">
                      <div className="font-medium text-gray-400 uppercase tracking-wide mb-2">Pattern Notation</div>
                      <div><strong>x</strong> = rest/silence</div>
                      <div><strong>1+</strong> = note 1 octave up</div>
                      <div><strong>2-</strong> = note 2 octave down</div>
                      <div><strong>1-8</strong> = chord note index</div>
                    </div> */}
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