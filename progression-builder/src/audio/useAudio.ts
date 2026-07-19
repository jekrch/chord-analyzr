import { useCallback, useEffect, useRef, useState } from 'react';
import { Synth } from './synth';

// One synth for the app: play/release plus volume and mute state.
export function useAudio() {
  const synthRef = useRef<Synth | null>(null);
  const synth = () => (synthRef.current ??= new Synth());

  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    synth().setVolume(volume);
  }, [volume]);

  useEffect(() => {
    synth().setMuted(muted);
  }, [muted]);

  const playNotes = useCallback((midis: number[]) => {
    synth().playNotes(midis);
  }, []);

  const releaseAll = useCallback(() => {
    synthRef.current?.releaseAll();
  }, []);

  return { volume, setVolume, muted, setMuted, playNotes, releaseAll };
}
