import { useState, useRef, useCallback } from 'react';
import { Midi } from '@tonejs/midi';

interface MidiNote {
  note: number; // MIDI note number (0-127)
  step: number; // Step number in the sequence
  duration: number; // Duration in steps
}

interface MidiRecording {
  notes: MidiNote[];
  bpm: number;
  subdivision: number;
}

export const useMidiRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<MidiRecording | null>(null);
  const activeNotesRef = useRef<Map<number, number>>(new Map()); // note -> start step

  const startRecording = useCallback((bpm: number, subdivision: number) => {
    recordingRef.current = {
      notes: [],
      bpm,
      subdivision,
    };
    activeNotesRef.current.clear();
    setIsRecording(true);
    console.log('MIDI Recording started at BPM:', bpm, 'Subdivision:', subdivision);
  }, []);

  const recordNoteOn = useCallback((midiNote: number, step: number) => {
    if (!recordingRef.current || !isRecording) return;
    
    // Store the step number when the note starts
    activeNotesRef.current.set(midiNote, step);
  }, [isRecording]);

  const recordNoteOff = useCallback((midiNote: number, currentStep: number, noteDuration: number) => {
    if (!recordingRef.current || !isRecording) return;
    
    const startStep = activeNotesRef.current.get(midiNote);
    if (startStep === undefined) return;
    
    // Calculate duration in steps based on the note duration setting
    // noteDuration is a multiplier (e.g., 0.9 means 90% of step duration)
    const durationInSteps = noteDuration;
    
    recordingRef.current.notes.push({
      note: midiNote,
      step: startStep,
      duration: durationInSteps,
    });
    
    activeNotesRef.current.delete(midiNote);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return null;
    
    // Close any still-active notes with default duration
    activeNotesRef.current.forEach((startStep, midiNote) => {
      recordingRef.current!.notes.push({
        note: midiNote,
        step: startStep,
        duration: 0.9, // Default 90% of step
      });
    });
    
    activeNotesRef.current.clear();
    setIsRecording(false);
    
    const recording = recordingRef.current;
    recordingRef.current = null;
    
    console.log('MIDI Recording stopped. Recorded notes:', recording.notes.length);
    return recording;
  }, []);

  const generateMidiFile = useCallback((recording: MidiRecording): Blob => {
    const midi = new Midi();
    midi.header.setTempo(recording.bpm);
    
    const track = midi.addTrack();
    
    // Calculate time per step in seconds
    const beatsPerMinute = recording.bpm;
    const secondsPerBeat = 60 / beatsPerMinute;
    const secondsPerStep = secondsPerBeat * recording.subdivision;
    
    recording.notes.forEach(note => {
      const startTime = note.step * secondsPerStep;
      const duration = note.duration * secondsPerStep;
      
      track.addNote({
        midi: note.note,
        time: startTime,
        duration: duration,
        velocity: 0.8
      });
    });
    
    const midiArray = midi.toArray();
    const buffer = midiArray.buffer.slice(0);
    return new Blob([buffer as any], { type: 'audio/midi' });
  }, []);

  const downloadMidi = useCallback((recording: MidiRecording, filename: string = 'recording.mid') => {
    const blob = generateMidiFile(recording);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateMidiFile]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordNoteOn,
    recordNoteOff,
    downloadMidi,
  };
};