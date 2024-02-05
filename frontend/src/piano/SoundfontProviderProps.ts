import { MidiValue } from 'react-piano';
import { InstrumentName } from 'soundfont-player';

export interface SoundfontProviderProps {
  instrumentName: InstrumentName;
  hostname: string;
  audioContext: AudioContext;
  render: (args: {
    isLoading: boolean;
    playNote: (midiNumber: any) => void;
    stopNote: (midiNumber: any) => void;
  }) => JSX.Element;
}
