import React, { useEffect, useRef } from 'react';
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

  // Start/stop recording based on sequencer playback
  useEffect(() => {
    if (globalPatternState.isPlaying && !isRecording) {
      // Sequencer started - begin recording
      startRecording(globalPatternState.bpm, globalPatternState.subdivision);
      pendingSaveRef.current = null;
      lastStepRef.current = -1;
    } else if (!globalPatternState.isPlaying && isRecording) {
      // Sequencer stopped - stop recording and prepare to save
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
    stopRecording
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
      downloadMidi(pendingSaveRef.current, `recording-${timestamp}.mid`);
      pendingSaveRef.current = null;
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-900/30 border border-red-700/50 rounded">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-red-300">Recording MIDI</span>
        </div>
      )}

      {/* Download Button (shown when there's a recording to save) */}
      {!isRecording && pendingSaveRef.current && (
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs font-medium uppercase tracking-wide"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>Save MIDI</span>
        </button>
      )}

      {/* Info text when idle */}
      {!isRecording && !pendingSaveRef.current && (
        <div className="text-xs text-slate-400 italic">
          Start sequencer to begin MIDI recording
        </div>
      )}
    </div>
  );
};

export default MidiRecorder;