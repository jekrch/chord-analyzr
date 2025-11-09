import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/20/solid';
import { MidiNumbers } from 'react-piano';
import { useMidiRecording } from '../hooks/useMidiRecording';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import { usePianoStore } from '../stores/pianoStore';

interface MidiRecorderProps {
  className?: string;
}

const convertToStandardNoteName = (noteName: string): string => {
  if (!noteName || noteName.length === 0) return 'C';
  
  const baseNote = noteName.charAt(0).toUpperCase();
  const accidentals = noteName.slice(1);
  
  const baseNoteMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  
  let semitones = baseNoteMap[baseNote];
  if (semitones === undefined) return 'C';
  
  const sharps = (accidentals.match(/#/g) || []).length;
  const flats = (accidentals.match(/b/g) || []).length;
  
  semitones += sharps - flats;
  semitones = ((semitones % 12) + 12) % 12;
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return noteNames[semitones];
};

const MidiRecorder: React.FC<MidiRecorderProps> = ({ className = '' }) => {
  const [midiRecordingEnabled, setMidiRecordingEnabled] = useState(false);
  
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    recordNoteOn, 
    recordNoteOff,
    downloadMidi 
  } = useMidiRecording();
  
  const { globalPatternState } = usePatternStore();
  const { activeNotes, activeChordIndex, addedChords } = usePlaybackStore();
  const { pianoSettings } = usePianoStore();
  
  const lastPlayedNoteRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(-1);
  const pendingSaveRef = useRef<any>(null);

  // Start/stop recording based on sequencer playback AND toggle state
  useEffect(() => {
    if (globalPatternState.isPlaying && !isRecording && midiRecordingEnabled) {
      // Sequencer started and recording is enabled - begin recording
      startRecording(globalPatternState.bpm, globalPatternState.subdivision);
      pendingSaveRef.current = null;
      lastStepRef.current = -1;
    } else if ((!globalPatternState.isPlaying || !midiRecordingEnabled) && isRecording) {
      // Sequencer stopped OR recording disabled - stop recording and prepare to save
      const recording = stopRecording();
      if (recording && recording.notes.length > 0) {
        pendingSaveRef.current = recording;
      }
      lastStepRef.current = -1;
    }
  }, [
    globalPatternState.isPlaying, 
    globalPatternState.bpm, 
    globalPatternState.subdivision,
    isRecording, 
    startRecording, 
    stopRecording,
    midiRecordingEnabled
  ]);

  // Track note events during playback - STEP-BASED
  useEffect(() => {
    if (!isRecording || !globalPatternState.isPlaying) return;
    if (globalPatternState.currentStep === lastStepRef.current) return;

    // Get current pattern (same logic as PianoControl)
    const currentPattern = activeChordIndex !== null && addedChords[activeChordIndex]
      ? addedChords[activeChordIndex].pattern
      : globalPatternState.currentPattern;

    if (!currentPattern || currentPattern.length === 0) return;

    const currentPatternIndex = globalPatternState.currentStep % currentPattern.length;
    const stepValue = currentPattern[currentPatternIndex];

    // Parse the step (same logic as PianoControl)
    const parsePatternStep = (step: string, noteCount: number) => {
      if (step === 'x' || step === 'X') return null;
      
      const isOctaveUp = step.includes('+');
      const isOctaveDown = step.includes('-');
      const noteIndex = parseInt(step.replace(/[+-]/g, '')) - 1;
      
      if (noteIndex >= 0 && noteIndex < noteCount) {
        return { noteIndex, octaveUp: isOctaveUp, octaveDown: isOctaveDown };
      }
      return null;
    };

    const parsedStep = parsePatternStep(stepValue, activeNotes.length);

    // If there was a previous note playing, turn it off
    if (lastPlayedNoteRef.current !== null) {
      recordNoteOff(lastPlayedNoteRef.current, globalPatternState.currentStep, pianoSettings.noteDuration);
      lastPlayedNoteRef.current = null;
    }

    // If this is a note (not a rest), record it
    if (parsedStep && activeNotes.length > 0) {
      const { noteIndex, octaveUp, octaveDown } = parsedStep;
      const { note, octave = 4 } = activeNotes[noteIndex];
      let finalOctave = octave;
      
      if (octaveUp) finalOctave += 1;
      if (octaveDown) finalOctave -= 1;
      
      finalOctave = Math.max(1, Math.min(8, finalOctave));
      
      const midiNote = MidiNumbers.fromNote(`${convertToStandardNoteName(note)}${finalOctave}`);
      recordNoteOn(midiNote, globalPatternState.currentStep);
      lastPlayedNoteRef.current = midiNote;
    }

    lastStepRef.current = globalPatternState.currentStep;
  }, [
    globalPatternState.currentStep, 
    globalPatternState.isPlaying,
    isRecording,
    activeNotes,
    activeChordIndex,
    addedChords,
    globalPatternState.currentPattern,
    pianoSettings.noteDuration,
    recordNoteOn,
    recordNoteOff
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lastPlayedNoteRef.current !== null && isRecording) {
        recordNoteOff(lastPlayedNoteRef.current, globalPatternState.currentStep, pianoSettings.noteDuration);
      }
    };
  }, [recordNoteOff, isRecording, globalPatternState.currentStep, pianoSettings.noteDuration]);

  const handleDownload = () => {
    if (pendingSaveRef.current) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      downloadMidi(pendingSaveRef.current, `modal-chordbuildr-${timestamp}.mid`);
    }
  };

  const handleToggleRecording = () => {
    setMidiRecordingEnabled(!midiRecordingEnabled);
    // If disabling while recording, stop immediately
    if (midiRecordingEnabled && isRecording) {
      const recording = stopRecording();
      if (recording && recording.notes.length > 0) {
        pendingSaveRef.current = recording;
      }
    }
  };

  return (
    <div className={`space-t-4 ${className}`}>
      {/* MIDI Recording Toggle */}
      <div className="flex items-center justify-between p-3 bg-mcb-elevated rounded-lg border border-mcb-primary">
        <div className="flex flex-col text-left">
          <span className="text-xs uppercase font-medium text-[var(--mcb-text-tertiary)] text-left mr-6">
            MIDI Recording
          </span>
          <div className="flex items-center space-x-2">
            {isRecording && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-[0.1em] mr-[0.25em]" />
            )}
            <span className={`text-xs ${isRecording ? 'text-red-300 font-medium' : 'text-[var(--mcb-text-tertiary)]'}`}>
              {midiRecordingEnabled
                ? isRecording
                  ? 'Recording MIDI'
                  : pendingSaveRef.current
                  ? 'Ready to record'
                  : 'Ready to record'
                : 'Disabled'
              }
            </span>
          </div>
        </div>
        <button
          onClick={handleToggleRecording}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--mcb-accent-primary)] focus:ring-offset-2 focus:ring-offset-gray-800 ${
            midiRecordingEnabled ? 'bg-[var(--mcb-accent-secondary)]' : 'bg-gray-600'
          }`}
          role="switch"
          aria-checked={midiRecordingEnabled}
          aria-label="Toggle MIDI recording"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              midiRecordingEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Download Button (shown when there's a recording to save) */}
      {!isRecording && pendingSaveRef.current && (
        <div className="mt-3">
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-3 py-1.5 h-8 bg-[var(--mcb-success-primary)] hover:bg-[var(--mcb-success-secondary)] text-white rounded transition-colors text-xs font-medium uppercase tracking-wide"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MidiRecorder;