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
import { useUIStore, KeyboardDisplayMode } from '../../stores/uiStore';
import { audioContext } from '../../piano/audioContext';
import { sequencerScheduler } from '../../services/SequencerScheduler';
import NotationView from './NotationView';

interface PianoProps {
  hideConfigControls?: boolean;
}

export const startOctave = 4;
export const endOctave = 7;

const DISPLAY_MODES: { mode: KeyboardDisplayMode; label: string; title: string }[] = [
  { mode: 'keyboard', label: 'Keys', title: 'Show the keyboard' },
  { mode: 'notation', label: 'Score', title: 'Show staff notation instead of the keyboard' },
  { mode: 'both', label: 'Both', title: 'Show staff notation above the keyboard' },
];

const PianoControl: React.FC<PianoProps> = ({
  hideConfigControls = false
}) => {

  // Optimized store selectors - only subscribe to what we need
  const normalizedScaleNotes = useMusicStore(state => state.normalizedScaleNotes);

  const pianoSettings = usePianoStore(state => state.pianoSettings);
  const availableInstruments = usePianoStore(state => state.availableInstruments);
  const setAvailableInstruments = usePianoStore(state => state.setAvailableInstruments);

  const activeNotes = usePlaybackStore(state => state.activeNotes);

  // Narrow subscription: only isPlaying. Subscribing to the whole
  // globalPatternState would re-render the piano on every sequencer step.
  const isPlaying = usePatternStore(state => state.globalPatternState.isPlaying);

  const keyboardDisplayMode = useUIStore(state => state.keyboardDisplayMode);
  const setKeyboardDisplayMode = useUIStore(state => state.setKeyboardDisplayMode);

  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';
  const stopAllNotesRef = useRef<(() => void) | null>(null);
  const [activePianoNotes, setActivePianoNotes] = useState<number[]>([]);
  // Keys currently lit by the sequencer. Their audio is scheduled directly on
  // the audio clock, so react-piano's playNote must not re-trigger them.
  const sequencerNotesRef = useRef<Set<number>>(new Set());
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

    if (!isPlaying && activeNotes.length > 0) {
      // Play all notes as a chord
      const chordMidiNotes = activeNotes.map(({ note, octave = 4 }) =>
        getMidiNote(note, octave)
      );
      setActivePianoNotes(chordMidiNotes);

      // Auto-release after 2 seconds
      chordSustainTimeoutRef.current = setTimeout(() => {
        if (!usePatternStore.getState().globalPatternState.isPlaying) {
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

  // Sequencer key highlighting — visuals only. The audio for these steps is
  // scheduled ahead on the audio clock by the SequencerScheduler; this
  // listener fires approximately on the beat, where visual jitter is invisible.
  useEffect(() => {
    if (!isPlaying) {
      sequencerNotesRef.current = new Set();
      return;
    }

    const unsubscribe = sequencerScheduler.onStep((step) => {
      if (step.midiNumber === null) {
        // Rest (or no chord selected) - clear any lit keys
        sequencerNotesRef.current = new Set();
        setActivePianoNotes([]);
        return;
      }

      // The scheduler plays the offset note; the visible key is the base one,
      // matching how interactive presses light keys before the offset applies.
      const visualMidi = step.midiNumber - midiOffset;
      sequencerNotesRef.current = new Set([visualMidi]);
      setActivePianoNotes([visualMidi]);

      window.setTimeout(() => {
        sequencerNotesRef.current.delete(visualMidi);
        setActivePianoNotes(current =>
          current.length === 1 && current[0] === visualMidi ? [] : current
        );
      }, step.durationMs);
    });

    return unsubscribe;
  }, [isPlaying, midiOffset]);

  // Detach the instrument from the scheduler on unmount
  useEffect(() => {
    return () => sequencerScheduler.setInstrument(null);
  }, []);

  const playNoteWithOffset = useCallback((playNote: (midiNumber: number) => void) =>
    (midiNumber: number) => {
      // Keys lit by the sequencer are visual-only here; their audio was
      // already scheduled sample-accurately on the audio clock.
      if (sequencerNotesRef.current.has(midiNumber)) {
        return;
      }
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
      return <div className="mx-auto mb-2 mcb-led" />;
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
        render={({ isLoading, playNote, stopNote, stopAllNotes, playNoteAt, stopAllNotesAt }) => {
          stopAllNotesRef.current = stopAllNotes;
          sequencerScheduler.setInstrument({ playNoteAt, stopAllNotesAt });

          return (
            <div ref={containerRef} className="relative w-full">
              {/* Display-mode selector: keyboard, staff notation, or both */}
              <div className="flex justify-end gap-1.5 mb-1.5">
                {DISPLAY_MODES.map(({ mode, label, title }) => (
                  <button
                    key={mode}
                    onClick={() => setKeyboardDisplayMode(mode)}
                    className={`mcb-switch ${keyboardDisplayMode === mode ? 'mcb-switch--on' : ''}`}
                    title={title}
                  >
                    <div className={`mcb-led ${keyboardDisplayMode === mode ? '' : 'mcb-led--off'}`} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {keyboardDisplayMode !== 'keyboard' && (
                <NotationView className={keyboardDisplayMode === 'both' ? 'mb-2' : ''} />
              )}

              {/* Chassis bezel: recessed screen the keyboard sits in. Kept
                  mounted (hidden) in Score mode — the SoundfontProvider
                  above is the audio path for the sequencer. */}
              <div className={`mcb-inset p-2 sm:p-3 w-full flex justify-center overflow-x-auto ${keyboardDisplayMode === 'notation' ? 'hidden' : ''}`}>
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