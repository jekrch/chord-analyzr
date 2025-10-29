import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import InstrumentListProvider from '../../piano/InstrumentListProvider';
import PianoConfig from '../../piano/PianoConfig';
import { SoundfontProvider } from '../../piano/SoundfontProvider';
import { getMidiNote, normalizeNoteName } from '../../util/NoteUtil';
import { useMusicStore } from '../../stores/musicStore';
import { usePianoStore } from '../../stores/pianoStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { usePatternStore } from '../../stores/patternStore';

// Create the AudioContext ONCE, outside the component.
// This ensures the same instance is reused across re-renders and prevents exceeding the browser limit.
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

interface PianoProps {
  hideConfigControls?: boolean;
}

export const startOctave = 4;
export const endOctave = 7;

const PianoControl: React.FC<PianoProps> = ({
  hideConfigControls = false
}) => {
  
  // Direct store access
  const musicStore = useMusicStore();
  const pianoStore = usePianoStore();
  const playbackStore = usePlaybackStore();
  const patternStore = usePatternStore();

  // Extract state from stores
  const {
    activeNotes,
    activeChordIndex,
    addedChords,
  } = playbackStore;

  const {
    normalizedScaleNotes,
  } = musicStore;

  const {
    currentlyActivePattern,
    globalPatternState,
  } = patternStore;

  const {
    pianoSettings,
    availableInstruments,
    setPianoInstrument,
    setCutOffPreviousNotes,
    setEq,
    setOctaveOffset,
    setReverbLevel,
    setNoteDuration,
    setVolume,
    setChorusLevel,
    setDelayLevel,
    setAvailableInstruments,
  } = pianoStore;

  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  const lastStepRef = useRef<number>(-1);
  const chordSustainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use ref instead of state to capture instrument list during render
  const instrumentListRef = useRef<string[] | null>(null);
  
  // Container ref for measuring width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  // Responsive width calculation
  const pianoWidth = useMemo(() => {
    const availableWidth = containerWidth;
    
    // Define responsive breakpoints and widths
    if (availableWidth < 400) {
      // Mobile: use most of available space
      return Math.max(320, availableWidth - 40);
    } else if (availableWidth < 768) {
      // Tablet: moderate scaling
      // Small desktop: good balance
      return Math.min(600, availableWidth - 60);
    } else if (availableWidth < 1200) {
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

  // Update store from ref after render completes
  useEffect(() => {
    if (instrumentListRef.current && instrumentListRef.current.length > 0 && 
        JSON.stringify(instrumentListRef.current) !== JSON.stringify(availableInstruments)) {
      setAvailableInstruments(instrumentListRef.current);
    }
  });

  const { firstNote, lastNote, keyboardShortcuts, midiOffset } = useMemo(() => {
    const anchorNote = 'c';
    const firstNote = getMidiNote(anchorNote, startOctave);
    const lastNote = getMidiNote(anchorNote, endOctave);
    const midiOffset = pianoSettings.octaveOffset * 12;

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
  }, [pianoSettings.octaveOffset]);

  const [pianoConfig, setPianoConfig] = useState<any>({
    instrumentName: pianoSettings.instrumentName,
  });

  // Update piano config when settings change
  useEffect(() => {
    setPianoConfig((prev: any) => ({
      ...prev,
      instrumentName: pianoSettings.instrumentName
    }));
  }, [pianoSettings.instrumentName]);

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
        getMidiNote(note, octave)
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
        
        // Convert note to standard format before passing to MidiNumbers.fromNote
        const midiNote = getMidiNote(note, finalOctave)
        
        if (!pianoSettings.cutOffPreviousNotes && stopAllNotesRef.current) {
          stopAllNotesRef.current();
        }
        
        setActivePianoNotes([midiNote]);
        
        const stepDuration = getStepDuration();
        const sustainDuration = Math.min(stepDuration * pianoSettings.noteDuration, stepDuration - 50);
        
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
    pianoSettings.cutOffPreviousNotes,
    pianoSettings.noteDuration,
    getStepDuration,
    getCurrentPattern,
    parsePatternStep
  ]);

  const playNoteWithOffset = (playNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      if (!pianoSettings.cutOffPreviousNotes && stopAllNotesRef.current) {
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
      instrumentName={pianoSettings.instrumentName}
      audioContext={audioContext}
      hostname={soundfontHostname}
      eq={pianoSettings.eq}
      reverbLevel={pianoSettings.reverbLevel}
      volume={pianoSettings.volume}
      chorusLevel={pianoSettings.chorusLevel}
      delayLevel={pianoSettings.delayLevel}
      render={({ isLoading, playNote, stopNote, stopAllNotes }) => {
        stopAllNotesRef.current = stopAllNotes;
        
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
                    return <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-300' : 'bg-blue-500'}`} />;
                  }
                  return null;
                }
                }
              />
            </div>
          </div>

          {/* Only show config controls if not hidden */}
          {!hideConfigControls && (
            <div className="mt-5">
              <InstrumentListProvider
                hostname={soundfontHostname}
                render={(instrumentList) => {
                  // Store in ref instead of triggering state update
                  if (instrumentList && instrumentList.length > 0) {
                    instrumentListRef.current = instrumentList;
                  }
                  
                  return (
                    <PianoConfig
                      config={pianoConfig}
                      setConfig={setPianoConfig}
                      instrumentList={instrumentList || availableInstruments}
                      keyboardShortcuts={keyboardShortcuts}
                      // Pass piano settings props
                      cutOffPreviousNotes={pianoSettings.cutOffPreviousNotes}
                      setCutOffPreviousNotes={setCutOffPreviousNotes}
                      eq={pianoSettings.eq}
                      setEq={setEq}
                      octaveOffset={pianoSettings.octaveOffset}
                      setOctaveOffset={setOctaveOffset}
                      reverbLevel={pianoSettings.reverbLevel}
                      setReverbLevel={setReverbLevel}
                      noteDuration={pianoSettings.noteDuration}
                      setNoteDuration={setNoteDuration}
                      volume={pianoSettings.volume}
                      setVolume={setVolume}
                      chorusLevel={pianoSettings.chorusLevel}
                      setChorusLevel={setChorusLevel}
                      delayLevel={pianoSettings.delayLevel}
                      setDelayLevel={setDelayLevel}
                      onInstrumentChange={setPianoInstrument}
                    />
                  )
                }}
              />
            </div>
          )}

          {/* Always ensure instrument list is available for the main controls */}
          <InstrumentListProvider
            hostname={soundfontHostname}
            render={(instrumentList) => {
              // Store in ref instead of triggering state update
              if (instrumentList && instrumentList.length > 0) {
                instrumentListRef.current = instrumentList;
              }
              return <></>;
            }}
          />
        </>)
      }}
    />
  );
};

export default PianoControl;