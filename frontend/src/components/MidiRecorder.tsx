import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/20/solid';
import { MidiNumbers } from 'react-piano';
import { useMidiRecording } from '../hooks/useMidiRecording';
import { usePlaybackStore } from '../stores/playbackStore';
import { usePatternStore } from '../stores/patternStore';
import { usePianoStore } from '../stores/pianoStore';
import { convertToStandardNoteName } from '../util/NoteUtil';

interface MidiRecorderProps {
  className?: string;
}

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
      <div className="flex items-center justify-between p-3 mcb-inset">
        <div className="flex flex-col text-left">
          <span className="mcb-label text-left mr-6">
            MIDI Recording
          </span>
          <div className="flex items-center space-x-2">
            {isRecording && (
              <div className="mcb-led mcb-led--danger animate-pulse mt-[0.1em] mr-[0.25em]" />
            )}
            <span className={`text-xs ${isRecording ? 'text-[var(--mcb-danger-text)] font-medium' : 'text-[var(--mcb-text-tertiary)]'}`}>
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
          className={`mcb-switch flex-shrink-0 ${
            isRecording ? 'mcb-switch--danger' : midiRecordingEnabled ? 'mcb-switch--on' : ''
          }`}
          role="switch"
          aria-checked={midiRecordingEnabled}
          aria-label="Toggle MIDI recording"
        >
          <span
            aria-hidden="true"
            className={`mcb-led ${
              isRecording ? 'mcb-led--danger animate-pulse' : midiRecordingEnabled ? '' : 'mcb-led--off'
            }`}
          />
          {midiRecordingEnabled ? 'On' : 'Off'}
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