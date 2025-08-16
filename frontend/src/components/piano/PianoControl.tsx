import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import InstrumentListProvider from '../../piano/InstrumentListProvider';
import PianoConfig from '../../piano/PianoConfig';
import { SoundfontProvider } from '../../piano/SoundfontProvider';
import { normalizeNoteName } from '../../util/NoteUtil';


// Create the AudioContext ONCE, outside the component.
// This ensures the same instance is reused across re-renders and prevents exceeding the browser limit.
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

interface PianoProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  activeChordIndex: number | null;
  addedChords: { name: string; notes: string; pattern: string[] }[]; 
  currentlyActivePattern: string[]; 
  globalPatternState: {
    currentPattern: string[]; 
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
    currentPattern: string[];
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
  currentlyActivePattern,
  globalPatternState,
  onPatternStateChange
}) => {
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  const lastStepRef = useRef<number>(-1);
  const chordSustainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Container ref for measuring width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  // Settings State - moved from the original component
  const [cutOffPreviousNotes, setCutOffPreviousNotes] = useState<boolean>(true);
  const [eq, setEq] = useState<EqSettings>({ bass: 0, mid: 0, treble: 0 });
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [reverbLevel, setReverbLevel] = useState<number>(0.0);
  const [noteDuration, setNoteDuration] = useState<number>(0.8);

  // Responsive width calculation
  const pianoWidth = useMemo(() => {
    
    const availableWidth = containerWidth;
    
    // Define responsive breakpoints and widths
    if (availableWidth < 400) {
      // Mobile: use most of available space
      return Math.max(320, availableWidth - 40);
    } else if (availableWidth < 768) {
      // Tablet: moderate scaling
      return Math.min(600, availableWidth - 60);
    } else if (availableWidth < 1200) {
      // Small desktop: good balance
      return Math.min(800, availableWidth - 80);
    } else {
      // Large desktop: generous but not excessive
      return Math.min(1000, availableWidth - 100);
    }
  }, [containerWidth]);

  // Measure container width and set up resize observer
  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Initial measurement
    measureWidth();

    // Set up ResizeObserver for dynamic updates
    const resizeObserver = new ResizeObserver(() => {
      measureWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback: window resize listener
    const handleResize = () => {
      measureWidth();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    instrumentName: 'electric_piano_1',
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

  // Get current active pattern (uses the same logic as App)
  const getCurrentPattern = useCallback(() => {
    // If a chord is selected, use its pattern; otherwise use currently active pattern
    if (activeChordIndex !== null && addedChords[activeChordIndex]) {
      return addedChords[activeChordIndex].pattern;
    }
    return currentlyActivePattern;
  }, [activeChordIndex, addedChords, currentlyActivePattern]);

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
        currentPattern?.length > 0 &&  // Added optional chaining
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
          <div ref={containerRef} className="relative w-full">
            {/* Piano Container - Properly centered */}
            <div className="w-full flex justify-center overflow-x-auto">
              <Piano
                noteRange={{ first: firstNote, last: lastNote }}
                playNote={playNoteWithOffset(playNote)}
                stopNote={stopNoteWithOffset(stopNote)}
                disabled={isLoading}
                width={pianoWidth}
                className={"mx-auto w-full"}
                activeNotes={activePianoNotes}
                renderNoteLabel={({ midiNumber, isAccidental }:any) => {
                  const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
                  const isScaleNote = normalizedScaleNotes.includes(normalizeNoteName(noteNameWithoutOctave)!);
                  if (isScaleNote) {
                    return <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-200' : 'bg-blue-400'}`} />;
                  }
                  return null;
                }
                }
              />
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
                  // Pass settings props to PianoConfig
                  cutOffPreviousNotes={cutOffPreviousNotes}
                  setCutOffPreviousNotes={setCutOffPreviousNotes}
                  eq={eq}
                  setEq={setEq}
                  octaveOffset={octaveOffset}
                  setOctaveOffset={setOctaveOffset}
                  reverbLevel={reverbLevel}
                  setReverbLevel={setReverbLevel}
                  noteDuration={noteDuration}
                  setNoteDuration={setNoteDuration}
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