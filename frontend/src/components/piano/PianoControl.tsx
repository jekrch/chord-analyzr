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
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

interface PianoProps {
  hideConfigControls?: boolean;
}

export const startOctave = 4;
export const endOctave = 7;

const PianoControl: React.FC<PianoProps> = ({
  hideConfigControls = false
}) => {
  

  const normalizedScaleNotes = useMusicStore(state => state.normalizedScaleNotes);
  const activeNotes = usePlaybackStore(state => state.activeNotes);
  
  const isPlaying = usePatternStore(state => state.globalPatternState.isPlaying);
  const currentStep = usePatternStore(state => state.globalPatternState.currentStep);

  const pianoSettings = usePianoStore(state => state.pianoSettings);
  const availableInstruments = usePianoStore(state => state.availableInstruments);
  
  const setAvailableInstruments = usePianoStore(state => state.setAvailableInstruments);
  
  // ============================================================================
  // LOCAL STATE & REFS
  // ============================================================================
  
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  const lastStepRef = useRef<number>(-1);
  const chordSustainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const instrumentListRef = useRef<string[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const pianoWidth = useMemo(() => {
    const availableWidth = containerWidth;
    
    if (availableWidth < 400) {
      return Math.max(320, availableWidth - 40);
    } else if (availableWidth < 768) {
      return Math.min(600, availableWidth - 60);
    } else if (availableWidth < 1200) {
      return Math.min(800, availableWidth - 80);
    } else {
      return Math.min(1000, availableWidth - 100);
    }
  }, [containerWidth]);

  // Update store from ref after render completes
  useEffect(() => {
    if (instrumentListRef.current && 
        instrumentListRef.current.length > 0 && 
        instrumentListRef.current !== availableInstruments) {
      setAvailableInstruments(instrumentListRef.current);
    }
  }, [availableInstruments, setAvailableInstruments]);

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

  // ============================================================================
  // CHORD PLAYING (when sequencer is OFF)
  // ============================================================================

  useEffect(() => {
    // Clear any existing timeout
    if (chordSustainTimeoutRef.current) {
      clearTimeout(chordSustainTimeoutRef.current);
      chordSustainTimeoutRef.current = null;
    }

    if (!isPlaying && activeNotes.length > 0) {
      // Play all notes as a chord
      const chordMidiNotes = activeNotes.map(({ note, octave = 4 }) =>
        getMidiNote(note, octave)
      );
      setActivePianoNotes(chordMidiNotes);
      
      // Auto-release after 2 seconds
      chordSustainTimeoutRef.current = setTimeout(() => {
        if (!isPlaying) {
          setActivePianoNotes([]);
        }
      }, 2000);
    } else if (!isPlaying && activeNotes.length === 0) {
      setActivePianoNotes([]);
    }

    return () => {
      if (chordSustainTimeoutRef.current) {
        clearTimeout(chordSustainTimeoutRef.current);
        chordSustainTimeoutRef.current = null;
      }
    };
  }, [activeNotes, isPlaying]);

  // ============================================================================
  // PATTERN PLAYBACK (when sequencer is ON)
  // ============================================================================

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
    // Read state without subscribing
    const { globalPatternState } = usePatternStore.getState();
    const quarterNoteDuration = 60000 / globalPatternState.bpm;
    return quarterNoteDuration * globalPatternState.subdivision;
  }, []);

  // Handle pattern playback when sequencer is ON
  useEffect(() => {
    // Read complex state without subscribing
    const { activeChordIndex, addedChords } = usePlaybackStore.getState();
    const { currentlyActivePattern } = usePatternStore.getState();
    
    // Get current pattern
    const currentPattern = activeChordIndex !== null && addedChords[activeChordIndex]
      ? addedChords[activeChordIndex].pattern
      : currentlyActivePattern;
    
    if (!isPlaying || 
        activeNotes.length === 0 || 
        !currentPattern?.length ||
        currentStep === lastStepRef.current) {
      return;
    }
    
    lastStepRef.current = currentStep;
    
    const currentPatternIndex = currentStep % currentPattern.length;
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
      
      const midiNote = getMidiNote(note, finalOctave);
      
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
  }, [
    currentStep,
    isPlaying,
    activeNotes,
    pianoSettings.cutOffPreviousNotes,
    pianoSettings.noteDuration,
    getStepDuration,
    parsePatternStep
  ]);

  // Reset on playback stop
  useEffect(() => {
    if (!isPlaying && lastStepRef.current !== -1) {
      setActivePianoNotes([]);
      lastStepRef.current = -1;
    }
  }, [isPlaying]);

  // ============================================================================
  // PIANO INTERACTION CALLBACKS
  // ============================================================================

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

  // ============================================================================
  // RESPONSIVE WIDTH MEASUREMENT
  // ============================================================================

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

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    const resizeObserver = new ResizeObserver(() => {
      measureWidth();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', measureWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureWidth);
    };
  }, [measureWidth]);

  // ============================================================================
  // RENDER NOTE LABELS
  // ============================================================================

  const renderNoteLabel = useCallback(({ midiNumber, isAccidental }: any) => {
    const noteNameWithoutOctave = MidiNumbers.getAttributes(midiNumber).note.slice(0, -1);
    const isScaleNote = normalizedScaleNotes.includes(normalizeNoteName(noteNameWithoutOctave)!);
    if (isScaleNote) {
      return <div className={`mx-auto mb-2 w-2 h-2 rounded-full ${isAccidental ? 'bg-[var(--mcb-accent-text-secondary)]' : 'bg-[var(--mcb-accent-primary)]'}`} />;
    }
    return null;
  }, [normalizedScaleNotes]);

  // ============================================================================
  // SOUNDFONT PROPS
  // ============================================================================

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

  if (!audioContext) {
    return <div>Audio context is not available.</div>;
  }

  return (
    <SoundfontProvider
      {...soundfontProps}
      render={({ isLoading, playNote, stopNote, stopAllNotes }) => {
        stopAllNotesRef.current = stopAllNotes;
        
        return (
          <>
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
          </>
        );
      }}
    />
  );
};

export default PianoControl;