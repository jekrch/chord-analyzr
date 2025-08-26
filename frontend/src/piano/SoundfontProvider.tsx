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
  volume: number;
  chorusLevel: number;
  delayLevel: number;
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
    volume: 0.8,
    chorusLevel: 0,
    delayLevel: 0,
  };

  // Audio nodes - using definite assignment assertion since they're initialized in setupAudioChain
  private effectsChain!: GainNode;
  private bassNode!: BiquadFilterNode;
  private midNode!: BiquadFilterNode;
  private trebleNode!: BiquadFilterNode;
  private dryGainNode!: GainNode;
  private wetGainNode!: GainNode;
  private convolverNode!: ConvolverNode;
  private masterVolumeNode!: GainNode;
  
  // Chorus effect nodes
  private chorusDelayNode!: DelayNode;
  private chorusLFO!: OscillatorNode;
  private chorusLFOGain!: GainNode;
  private chorusDryGain!: GainNode;
  private chorusWetGain!: GainNode;
  private chorusMixNode!: GainNode;
  
  // Delay effect nodes
  private delayNode!: DelayNode;
  private delayFeedbackGain!: GainNode;
  private delayDryGain!: GainNode;
  private delayWetGain!: GainNode;
  private delayMixNode!: GainNode;

  constructor(props: SoundfontProviderProps) {
    super(props);
    this.state = {
      activeAudioNodes: {},
      instrument: null,
    };

    this.setupAudioChain();
  }

  private setupAudioChain = () => {
    const { audioContext, eq, reverbLevel, volume, chorusLevel, delayLevel } = this.props;

    // Create the main effects chain entry point
    this.effectsChain = audioContext.createGain();

    // Master volume control (applied first)
    this.masterVolumeNode = audioContext.createGain();
    this.masterVolumeNode.gain.value = volume;

    // EQ nodes
    this.bassNode = audioContext.createBiquadFilter();
    this.midNode = audioContext.createBiquadFilter();
    this.trebleNode = audioContext.createBiquadFilter();
    
    this.bassNode.type = 'lowshelf'; 
    this.bassNode.frequency.value = 320;
    this.bassNode.gain.value = eq.bass;
    
    this.midNode.type = 'peaking'; 
    this.midNode.frequency.value = 1000; 
    this.midNode.Q.value = 1;
    this.midNode.gain.value = eq.mid;
    
    this.trebleNode.type = 'highshelf'; 
    this.trebleNode.frequency.value = 3200;
    this.trebleNode.gain.value = eq.treble;

    // Chorus effect setup
    this.chorusDelayNode = audioContext.createDelay(0.05);
    this.chorusDelayNode.delayTime.value = 0.015;
    
    this.chorusLFO = audioContext.createOscillator();
    this.chorusLFO.frequency.value = 1.5;
    this.chorusLFO.type = 'sine';
    
    this.chorusLFOGain = audioContext.createGain();
    this.chorusLFOGain.gain.value = 0.005;
    
    this.chorusDryGain = audioContext.createGain();
    this.chorusWetGain = audioContext.createGain();
    this.chorusMixNode = audioContext.createGain();
    
    // Connect chorus LFO
    this.chorusLFO.connect(this.chorusLFOGain);
    this.chorusLFOGain.connect(this.chorusDelayNode.delayTime);
    this.chorusLFO.start();

    // Delay effect setup
    this.delayNode = audioContext.createDelay(1.0);
    this.delayNode.delayTime.value = 0.3;
    
    this.delayFeedbackGain = audioContext.createGain();
    this.delayFeedbackGain.gain.value = 0.4;
    
    this.delayDryGain = audioContext.createGain();
    this.delayWetGain = audioContext.createGain();
    this.delayMixNode = audioContext.createGain();
    
    // Connect delay feedback
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Reverb setup
    this.convolverNode = audioContext.createConvolver();
    this.wetGainNode = audioContext.createGain();
    this.dryGainNode = audioContext.createGain();
    this.convolverNode.buffer = this.generateImpulseResponse(audioContext);

    // Create the complete audio chain:
    // Input -> Volume -> EQ -> Chorus -> Delay -> Reverb -> Output
    
    // Connect the chain
    this.effectsChain.connect(this.masterVolumeNode);
    this.masterVolumeNode.connect(this.bassNode);
    this.bassNode.connect(this.midNode);
    this.midNode.connect(this.trebleNode);
    
    // Chorus processing
    this.trebleNode.connect(this.chorusDryGain);
    this.trebleNode.connect(this.chorusDelayNode);
    this.chorusDelayNode.connect(this.chorusWetGain);
    this.chorusDryGain.connect(this.chorusMixNode);
    this.chorusWetGain.connect(this.chorusMixNode);
    
    // Delay processing
    this.chorusMixNode.connect(this.delayDryGain);
    this.chorusMixNode.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);
    this.delayDryGain.connect(this.delayMixNode);
    this.delayWetGain.connect(this.delayMixNode);
    
    // Reverb processing
    this.delayMixNode.connect(this.dryGainNode);
    this.delayMixNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    
    // Final output
    this.dryGainNode.connect(audioContext.destination);
    this.wetGainNode.connect(audioContext.destination);

    // Initialize effect levels
    this.updateReverbMix(reverbLevel);
    this.updateChorusMix(chorusLevel);
    this.updateDelayMix(delayLevel);
  }

  private generateImpulseResponse = (audioContext: AudioContext): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const duration = 3.0;
    const decay = 1.5;
    const impulse = audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < impulse.length; i++) {
            const t = i / impulse.length;
            const earlyReflections = Math.sin(t * Math.PI * 20) * Math.exp(-t * 3);
            const lateReverb = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
            const diffusion = Math.sin(t * Math.PI * 100) * 0.1 * Math.exp(-t * 8);
            
            channelData[i] = (earlyReflections * 0.3 + lateReverb * 0.6 + diffusion * 0.1) * 1.5;
            
            if (channel === 1) {
                channelData[i] *= 1 + Math.sin(t * Math.PI * 7) * 0.2;
            }
        }
    }
    return impulse;
  }
  
  private updateReverbMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = Math.pow(level, 0.7) * 1.2;
    const dryLevel = 1 - (level * 0.6);
    
    this.dryGainNode.gain.setValueAtTime(dryLevel, currentTime);
    this.wetGainNode.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateChorusMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = level * 0.8;
    const dryLevel = 1 - (level * 0.3);
    
    this.chorusDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.chorusWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateDelayMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = level * 0.6;
    const dryLevel = 1 - (level * 0.2);
    
    this.delayDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.delayWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateVolume = (volume: number) => {
    const currentTime = this.props.audioContext.currentTime;
    this.masterVolumeNode.gain.setValueAtTime(volume, currentTime);
  }

  componentDidMount() { 
    this.loadInstrument(this.props.instrumentName); 
  }

  componentDidUpdate(prevProps: SoundfontProviderProps) {
    if (prevProps.instrumentName !== this.props.instrumentName) {
      this.loadInstrument(this.props.instrumentName);
    }
    if (JSON.stringify(prevProps.eq) !== JSON.stringify(this.props.eq)) {
        const currentTime = this.props.audioContext.currentTime;
        this.bassNode.gain.setValueAtTime(this.props.eq.bass, currentTime);
        this.midNode.gain.setValueAtTime(this.props.eq.mid, currentTime);
        this.trebleNode.gain.setValueAtTime(this.props.eq.treble, currentTime);
    }
    if (prevProps.reverbLevel !== this.props.reverbLevel) {
        this.updateReverbMix(this.props.reverbLevel);
    }
    if (prevProps.volume !== this.props.volume) {
        this.updateVolume(this.props.volume);
    }
    if (prevProps.chorusLevel !== this.props.chorusLevel) {
        this.updateChorusMix(this.props.chorusLevel);
    }
    if (prevProps.delayLevel !== this.props.delayLevel) {
        this.updateDelayMix(this.props.delayLevel);
    }
  }

  loadInstrument = (instrumentName: string) => {
    this.setState({ instrument: null });
    
    // Load instrument with custom destination to route through our effects
    Soundfont.instrument(this.props.audioContext, instrumentName as any, {
      format: this.props.format,
      soundfont: this.props.soundfont,
      nameToUrl: (name:any, soundfont:any, format:any) => `${this.props.hostname}/${soundfont}/${name}-${format}.js`,
      destination: this.effectsChain, // Route audio through our effects chain
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
      if (!this.state.instrument) return;
      
      // Play the note - it should automatically route through our effects chain
      // because we set the destination when loading the instrument
      const audioNode = this.state.instrument.play(midiNumber.toString());
      
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