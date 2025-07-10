import React from 'react';
import Soundfont, { Player } from 'soundfont-player';

interface EqSettings {
  bass: number;
  mid: number;
  treble: number;
}

interface SoundfontProviderProps {
  instrumentName: string;
  hostname: string;
  format?: 'mp3' | 'ogg';
  soundfont?: 'MusyngKite' | 'FluidR3_GM';
  audioContext: AudioContext;
  eq: EqSettings;
  reverbLevel: number;
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
  activeAudioNodes: { [key: number]: Player };
  instrument: Player | null;
}

export class SoundfontProvider extends React.Component<SoundfontProviderProps, SoundfontProviderState> {
  static defaultProps = {
    format: 'mp3',
    soundfont: 'MusyngKite',
    instrumentName: 'acoustic_grand_piano',
    eq: { bass: 0, mid: 0, treble: 0 },
    reverbLevel: 0,
  };

  private bassNode: BiquadFilterNode;
  private midNode: BiquadFilterNode;
  private trebleNode: BiquadFilterNode;
  private dryGainNode: GainNode;
  private wetGainNode: GainNode;
  private convolverNode: ConvolverNode;

  constructor(props: SoundfontProviderProps) {
    super(props);
    this.state = {
      activeAudioNodes: {},
      instrument: null,
    };

    const { audioContext, eq, reverbLevel } = this.props;

    this.bassNode = audioContext.createBiquadFilter();
    this.midNode = audioContext.createBiquadFilter();
    this.trebleNode = audioContext.createBiquadFilter();
    this.bassNode.type = 'lowshelf'; this.bassNode.frequency.value = 320;
    this.midNode.type = 'peaking'; this.midNode.frequency.value = 1000; this.midNode.Q.value = 1;
    this.trebleNode.type = 'highshelf'; this.trebleNode.frequency.value = 3200;
    this.bassNode.gain.value = eq.bass;
    this.midNode.gain.value = eq.mid;
    this.trebleNode.gain.value = eq.treble;
    this.bassNode.connect(this.midNode).connect(this.trebleNode);

    this.convolverNode = audioContext.createConvolver();
    this.wetGainNode = audioContext.createGain();
    this.dryGainNode = audioContext.createGain();
    this.convolverNode.buffer = this.generateImpulseResponse(audioContext);

    this.trebleNode.connect(this.dryGainNode);
    this.trebleNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.dryGainNode.connect(audioContext.destination);
    this.wetGainNode.connect(audioContext.destination);

    this.updateReverbMix(reverbLevel);
  }

  private generateImpulseResponse = (audioContext: AudioContext): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const duration = 3.0; // Increased duration for longer reverb tail
    const decay = 1.5; // Adjusted decay for more pronounced effect
    const impulse = audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < impulse.length; i++) {
            const t = i / impulse.length;
            // Create a more complex impulse response with multiple reflections
            const earlyReflections = Math.sin(t * Math.PI * 20) * Math.exp(-t * 3);
            const lateReverb = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
            const diffusion = Math.sin(t * Math.PI * 100) * 0.1 * Math.exp(-t * 8);
            
            // Combine early reflections, late reverb, and diffusion
            channelData[i] = (earlyReflections * 0.3 + lateReverb * 0.6 + diffusion * 0.1) * 1.5;
            
            // Add slight stereo width by modulating one channel differently
            if (channel === 1) {
                channelData[i] *= 1 + Math.sin(t * Math.PI * 7) * 0.2;
            }
        }
    }
    return impulse;
  }
  
  private updateReverbMix = (level: number) => {
    if (this.dryGainNode && this.wetGainNode) {
        // Use a more aggressive curve for wet/dry mix
        const wetLevel = Math.pow(level, 0.7) * 1.2; // Boost the wet signal
        const dryLevel = 1 - (level * 0.6); // Keep more dry signal present
        
        this.dryGainNode.gain.setValueAtTime(dryLevel, this.props.audioContext.currentTime);
        this.wetGainNode.gain.setValueAtTime(wetLevel, this.props.audioContext.currentTime);
    }
  }

  componentDidMount() { this.loadInstrument(this.props.instrumentName); }

  componentDidUpdate(prevProps: SoundfontProviderProps) {
    if (prevProps.instrumentName !== this.props.instrumentName) {
      this.loadInstrument(this.props.instrumentName);
    }
    if (JSON.stringify(prevProps.eq) !== JSON.stringify(this.props.eq)) {
        this.bassNode.gain.setValueAtTime(this.props.eq.bass, this.props.audioContext.currentTime);
        this.midNode.gain.setValueAtTime(this.props.eq.mid, this.props.audioContext.currentTime);
        this.trebleNode.gain.setValueAtTime(this.props.eq.treble, this.props.audioContext.currentTime);
    }
    if (prevProps.reverbLevel !== this.props.reverbLevel) {
        this.updateReverbMix(this.props.reverbLevel);
    }
  }

  loadInstrument = (instrumentName: string) => {
    this.setState({ instrument: null });
    Soundfont.instrument(this.props.audioContext, instrumentName as any, {
      // These two properties were missing and are now restored
      format: this.props.format,
      soundfont: this.props.soundfont,
      nameToUrl: (name:any, soundfont:any, format:any) => `${this.props.hostname}/${soundfont}/${name}-${format}.js`,
    }).then((instrument) => {
      // The onLoad callback logic is also restored here
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
      if (!this.state.instrument) return;
      const audioNode = this.state.instrument.play(midiNumber.toString());
      audioNode.connect(this.bassNode);
      this.setState((prevState) => ({
        activeAudioNodes: { ...prevState.activeAudioNodes, [midiNumber]: audioNode },
      }));
    });
  };

  stopNote = (midiNumber: number) => {
    this.resumeAudio().then(() => {
      const audioNode = this.state.activeAudioNodes[midiNumber];
      if (audioNode) {
        audioNode.stop();
        this.setState((prevState) => {
            const newNodes = { ...prevState.activeAudioNodes };
            delete newNodes[midiNumber];
            return { activeAudioNodes: newNodes };
        });
      }
    });
  };
  
  resumeAudio = (): Promise<void> => {
    if (this.props.audioContext.state === 'suspended') {
      return this.props.audioContext.resume();
    } else {
      return Promise.resolve();
    }
  };
  
  stopAllNotes = () => {
    this.resumeAudio().then(() => {
      Object.values(this.state.activeAudioNodes).forEach((node) => {
        if (node) {
          node.stop();
        }
      });
      this.setState({
        activeAudioNodes: {},
      });
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