import React from 'react';
import Soundfont from 'soundfont-player';

interface SoundfontProviderProps {
  instrumentName: string;
  hostname: string;
  format?: 'mp3' | 'ogg';
  soundfont?: 'MusyngKite' | 'FluidR3_GM';
  audioContext: AudioContext;
  onLoad?: (args: {
    playNote: (midiNumber: number) => void;
    stopNote: (midiNumber: number) => void;
    stopAllNotes: () => void;
  }) => void;
  render?: (args: {
    isLoading: boolean;
    playNote: (midiNumber: number) => void;
    stopNote: (midiNumber: number) => void;
    stopAllNotes: () => void;
  }) => JSX.Element | null;
}

interface SoundfontProviderState {
  activeAudioNodes: { [key: number]: any };
  instrument: any | null;
}

export class SoundfontProvider extends React.Component<SoundfontProviderProps, SoundfontProviderState> {
  static defaultProps = {
    format: 'mp3',
    soundfont: 'MusyngKite',
    instrumentName: 'acoustic_grand_piano',
  };

  constructor(props: SoundfontProviderProps) {
    super(props);
    this.state = {
      activeAudioNodes: {},
      instrument: null,
    };
  }

  componentDidMount() {
    this.loadInstrument(this.props.instrumentName);
  }

  componentDidUpdate(prevProps: SoundfontProviderProps) {
    if (prevProps.instrumentName !== this.props.instrumentName) {
      this.loadInstrument(this.props.instrumentName);
    }
  }

  loadInstrument = (instrumentName: string) => {
    this.setState({ instrument: null });
    Soundfont.instrument(this.props.audioContext, instrumentName as any, {
      format: this.props.format,
      soundfont: this.props.soundfont,
      nameToUrl: (name: string, soundfont: string, format: string) => {
        return `${this.props.hostname}/${soundfont}/${name}-${format}.js`;
      },
    }).then((instrument) => {
      this.setState({ instrument });
      if (this.props.onLoad) {
        this.props.onLoad({
          playNote: this.playNote,
          stopNote: this.stopNote,
          stopAllNotes: this.stopAllNotes,
        });
      }
    });
  };

  playNote = (midiNumber: number) => {
    this.resumeAudio().then(() => {
      const audioNode = this.state.instrument.play(midiNumber);
      this.setState({
        activeAudioNodes: { ...this.state.activeAudioNodes, [midiNumber]: audioNode },
      });
    });
  };

  stopNote = (midiNumber: number) => {
    this.resumeAudio().then(() => {
      const audioNode = this.state.activeAudioNodes[midiNumber];
      if (audioNode) {
        audioNode.stop();
        this.setState({
          activeAudioNodes: { ...this.state.activeAudioNodes, [midiNumber]: null },
        });
      }
    });
  };

  resumeAudio = () => {
    if (this.props.audioContext.state === 'suspended') {
      return this.props.audioContext.resume();
    } else {
      return Promise.resolve();
    }
  };

  stopAllNotes = () => {
    this.props.audioContext.resume().then(() => {
      Object.values(this.state.activeAudioNodes).forEach((node) => {
        if (node) node.stop();
      });
      this.setState({ activeAudioNodes: {} });
    });
  };

  render() {
    return this.props.render ? this.props.render({
      isLoading: !this.state.instrument,
      playNote: this.playNote,
      stopNote: this.stopNote,
      stopAllNotes: this.stopAllNotes,
    }) : null;
  }
}

export default SoundfontProvider;
