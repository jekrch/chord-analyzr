import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';
import InstrumentListProvider from '../../piano/InstrumentListProvider';
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

  // Optimized store selectors - only subscribe to what we need
  const normalizedScaleNotes = useMusicStore(state => state.normalizedScaleNotes);

  const pianoSettings = usePianoStore(state => state.pianoSettings);
  const availableInstruments = usePianoStore(state => state.availableInstruments);
  const setAvailableInstruments = usePianoStore(state => state.setAvailableInstruments);

  const activeNotes = usePlaybackStore(state => state.activeNotes);
  const activeChordIndex = usePlaybackStore(state => state.activeChordIndex);
  const addedChords = usePlaybackStore(state => state.addedChords);

  const currentlyActivePattern = usePatternStore(state => state.currentlyActivePattern);
  const globalPatternState = usePatternStore(state => state.globalPatternState);

  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  const lastStepRef = useRef<number>(-1);
  const chordSustainTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced measure function
  const measureWidth = useMemo(() => {
    let timeoutId: number;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }, 100);
    };
  }, []);

  // Measure container width and set up resize observer
  useEffect(() => {
    // Initial measurement
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    // Set up ResizeObserver for dynamic updates
    const resizeObserver = new ResizeObserver(() => {
      measureWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback: window resize listener
    window.addEventListener('resize', measureWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureWidth);
    };
  }, [measureWidth]);

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

  const playNoteWithOffset = useCallback((playNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      if (!pianoSettings.cutOffPreviousNotes && stopAllNotesRef.current) {
        stopAllNotesRef.current();
      }
      playNote(midiNumber + midiOffset);
    }, [pianoSettings.cutOffPreviousNotes, midiOffset]);

  const stopNoteWithOffset = useCallback((stopNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      stopNote(midiNumber + midiOffset);
    }, [midiOffset]);

  // Memoized render note label function
  const renderNoteLabel = useCallback(({ midiNumber, isAccidental }: any) => {
    const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
    const isScaleNote = normalizedScaleNotes.includes(normalizeNoteName(noteNameWithoutOctave)!);
    if (isScaleNote) {
      return <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-blue-300' : 'bg-blue-500'}`} />;
    }
    return null;
  }, [normalizedScaleNotes]);

  // Memoize SoundfontProvider props to prevent unnecessary re-renders
  const soundfontProps = useMemo(() => ({
    instrumentName: pianoSettings.instrumentName,
    audioContext: audioContext!,
    hostname: soundfontHostname,
    eq: pianoSettings.eq,
    reverbLevel: pianoSettings.reverbLevel,
    volume: pianoSettings.volume,
    chorusLevel: pianoSettings.chorusLevel,
    delayLevel: pianoSettings.delayLevel,
    distortionLevel: pianoSettings.distortionLevel,
    bitcrusherLevel: pianoSettings.bitcrusherLevel,
    phaserLevel: pianoSettings.phaserLevel,
    flangerLevel: pianoSettings.flangerLevel,
    ringModLevel: pianoSettings.ringModLevel,
    autoFilterLevel: pianoSettings.autoFilterLevel,
    tremoloLevel: pianoSettings.tremoloLevel,
    stereoWidthLevel: pianoSettings.stereoWidthLevel,
    compressorLevel: pianoSettings.compressorLevel,
  }), [pianoSettings]);

  // Callback to handle instrument list loading - store directly when available
  const handleInstrumentListLoaded = useCallback((instrumentList: string[] | null) => {
    if (instrumentList && instrumentList.length > 0 && instrumentList !== availableInstruments) {
      console.log('Loading instruments:', instrumentList.length);
      setAvailableInstruments(instrumentList);
    }
  }, [availableInstruments, setAvailableInstruments]);

  if (!audioContext) {
    return <div>Audio context is not available.</div>;
  }

  return (
    <>
      {/* Load instruments FIRST, before anything else */}
      <InstrumentListProvider
        hostname={soundfontHostname}
        render={handleInstrumentListLoaded}
      />

      <SoundfontProvider
        {...soundfontProps}
        render={({ isLoading, playNote, stopNote, stopAllNotes }) => {
          stopAllNotesRef.current = stopAllNotes;

          return (
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
                  renderNoteLabel={renderNoteLabel}
                />
              </div>
            </div>
          );
        }}
      />
    </>
  );
};

export default PianoControl;