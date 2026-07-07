// Create the AudioContext ONCE, at module level.
// This ensures the same instance is shared by the SoundfontProvider (audio output)
// and the SequencerScheduler (timing source), and prevents exceeding the browser limit.
export const audioContext =
  typeof window !== 'undefined'
    ? new (window.AudioContext || (window as any).webkitAudioContext)()
    : null;
