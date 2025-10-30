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
  distortionLevel: number;
  bitcrusherLevel: number;
  phaserLevel: number;
  flangerLevel: number;
  ringModLevel: number;
  autoFilterLevel: number;
  tremoloLevel: number;
  stereoWidthLevel: number;
  compressorLevel: number;
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
    distortionLevel: 0,
    bitcrusherLevel: 0,
    phaserLevel: 0,
    flangerLevel: 0,
    ringModLevel: 0,
    autoFilterLevel: 0,
    tremoloLevel: 0,
    stereoWidthLevel: 0,
    compressorLevel: 0,
  };

  // Existing audio nodes
  private effectsChain!: GainNode;
  private bassNode!: BiquadFilterNode;
  private midNode!: BiquadFilterNode;
  private trebleNode!: BiquadFilterNode;
  private dryGainNode!: GainNode;
  private wetGainNode!: GainNode;
  private convolverNode!: ConvolverNode;
  private masterVolumeNode!: GainNode;

  private chorusDelayNode!: DelayNode;
  private chorusLFO!: OscillatorNode;
  private chorusLFOGain!: GainNode;
  private chorusDryGain!: GainNode;
  private chorusWetGain!: GainNode;
  private chorusMixNode!: GainNode;

  private delayNode!: DelayNode;
  private delayFeedbackGain!: GainNode;
  private delayDryGain!: GainNode;
  private delayWetGain!: GainNode;
  private delayMixNode!: GainNode;

  // NEW EFFECTS NODES
  // Distortion
  private distortionNode!: WaveShaperNode;
  private distortionDryGain!: GainNode;
  private distortionWetGain!: GainNode;
  private distortionMixNode!: GainNode;

  // Bitcrusher (using WaveShaper for bit reduction)
  private bitcrusherNode!: WaveShaperNode;
  private bitcrusherDryGain!: GainNode;
  private bitcrusherWetGain!: GainNode;
  private bitcrusherMixNode!: GainNode;

  // Phaser
  private phaserAllPass1!: BiquadFilterNode;
  private phaserAllPass2!: BiquadFilterNode;
  private phaserAllPass3!: BiquadFilterNode;
  private phaserAllPass4!: BiquadFilterNode;
  private phaserLFO!: OscillatorNode;
  private phaserLFOGain!: GainNode;
  private phaserDryGain!: GainNode;
  private phaserWetGain!: GainNode;
  private phaserMixNode!: GainNode;

  // Flanger
  private flangerDelayNode!: DelayNode;
  private flangerLFO!: OscillatorNode;
  private flangerLFOGain!: GainNode;
  private flangerFeedbackGain!: GainNode;
  private flangerDryGain!: GainNode;
  private flangerWetGain!: GainNode;
  private flangerMixNode!: GainNode;

  // Ring Modulator
  private ringModGain!: GainNode;
  private ringModOscillator!: OscillatorNode;
  private ringModDryGain!: GainNode;
  private ringModWetGain!: GainNode;
  private ringModMixNode!: GainNode;

  // Auto-Filter
  private autoFilterNode!: BiquadFilterNode;
  private autoFilterLFO!: OscillatorNode;
  private autoFilterLFOGain!: GainNode;
  private autoFilterDryGain!: GainNode;
  private autoFilterWetGain!: GainNode;
  private autoFilterMixNode!: GainNode;

  // Tremolo
  private tremoloGain!: GainNode;
  private tremoloLFO!: OscillatorNode;
  private tremoloLFOGain!: GainNode;
  private tremoloDryGain!: GainNode;
  private tremoloWetGain!: GainNode;
  private tremoloMixNode!: GainNode;

  // Stereo Widener
  private stereoWidthSplitter!: ChannelSplitterNode;
  private stereoWidthMerger!: ChannelMergerNode;
  private stereoWidthDelayL!: DelayNode;
  private stereoWidthDelayR!: DelayNode;
  private stereoWidthDryGain!: GainNode;
  private stereoWidthWetGain!: GainNode;
  private stereoWidthMixNode!: GainNode;

  // Compressor
  private compressorNode!: DynamicsCompressorNode;
  private compressorDryGain!: GainNode;
  private compressorWetGain!: GainNode;
  private compressorMixNode!: GainNode;

  constructor(props: SoundfontProviderProps) {
    super(props);
    this.state = {
      activeAudioNodes: {},
      instrument: null,
    };

    this.setupAudioChain();
  }

  private setupAudioChain = () => {
    const { audioContext, eq, reverbLevel, volume, chorusLevel, delayLevel,
      distortionLevel, bitcrusherLevel, phaserLevel, flangerLevel,
      ringModLevel, autoFilterLevel, tremoloLevel, stereoWidthLevel,
      compressorLevel } = this.props;

    this.effectsChain = audioContext.createGain();
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

    // === DISTORTION SETUP ===
    this.distortionNode = audioContext.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0) as any;
    this.distortionNode.oversample = '4x';
    this.distortionDryGain = audioContext.createGain();
    this.distortionWetGain = audioContext.createGain();
    this.distortionMixNode = audioContext.createGain();

    // === BITCRUSHER SETUP ===
    this.bitcrusherNode = audioContext.createWaveShaper();
    this.bitcrusherNode.curve = this.makeBitcrusherCurve(16) as any;
    this.bitcrusherDryGain = audioContext.createGain();
    this.bitcrusherWetGain = audioContext.createGain();
    this.bitcrusherMixNode = audioContext.createGain();

    // === PHASER SETUP ===
    this.phaserAllPass1 = audioContext.createBiquadFilter();
    this.phaserAllPass2 = audioContext.createBiquadFilter();
    this.phaserAllPass3 = audioContext.createBiquadFilter();
    this.phaserAllPass4 = audioContext.createBiquadFilter();

    [this.phaserAllPass1, this.phaserAllPass2, this.phaserAllPass3, this.phaserAllPass4].forEach(filter => {
      filter.type = 'allpass';
      filter.frequency.value = 1000;
    });

    this.phaserLFO = audioContext.createOscillator();
    this.phaserLFO.frequency.value = 0.5;
    this.phaserLFO.type = 'sine';

    this.phaserLFOGain = audioContext.createGain();
    this.phaserLFOGain.gain.value = 800;

    this.phaserDryGain = audioContext.createGain();
    this.phaserWetGain = audioContext.createGain();
    this.phaserMixNode = audioContext.createGain();

    this.phaserLFO.connect(this.phaserLFOGain);
    this.phaserLFOGain.connect(this.phaserAllPass1.frequency);
    this.phaserLFOGain.connect(this.phaserAllPass2.frequency);
    this.phaserLFOGain.connect(this.phaserAllPass3.frequency);
    this.phaserLFOGain.connect(this.phaserAllPass4.frequency);
    this.phaserLFO.start();

    // === FLANGER SETUP ===
    this.flangerDelayNode = audioContext.createDelay(0.02);
    this.flangerDelayNode.delayTime.value = 0.005;

    this.flangerLFO = audioContext.createOscillator();
    this.flangerLFO.frequency.value = 0.5;
    this.flangerLFO.type = 'sine';

    this.flangerLFOGain = audioContext.createGain();
    this.flangerLFOGain.gain.value = 0.003;

    this.flangerFeedbackGain = audioContext.createGain();
    this.flangerFeedbackGain.gain.value = 0.5;

    this.flangerDryGain = audioContext.createGain();
    this.flangerWetGain = audioContext.createGain();
    this.flangerMixNode = audioContext.createGain();

    this.flangerLFO.connect(this.flangerLFOGain);
    this.flangerLFOGain.connect(this.flangerDelayNode.delayTime);
    this.flangerDelayNode.connect(this.flangerFeedbackGain);
    this.flangerFeedbackGain.connect(this.flangerDelayNode);
    this.flangerLFO.start();

    // === RING MODULATOR SETUP ===
    this.ringModGain = audioContext.createGain();
    this.ringModGain.gain.value = 0;

    this.ringModOscillator = audioContext.createOscillator();
    this.ringModOscillator.frequency.value = 100;
    this.ringModOscillator.type = 'sine';

    this.ringModDryGain = audioContext.createGain();
    this.ringModWetGain = audioContext.createGain();
    this.ringModMixNode = audioContext.createGain();

    this.ringModOscillator.connect(this.ringModGain.gain);
    this.ringModOscillator.start();

    // === AUTO-FILTER SETUP ===
    this.autoFilterNode = audioContext.createBiquadFilter();
    this.autoFilterNode.type = 'lowpass';
    this.autoFilterNode.frequency.value = 2000;
    this.autoFilterNode.Q.value = 5;

    this.autoFilterLFO = audioContext.createOscillator();
    this.autoFilterLFO.frequency.value = 2;
    this.autoFilterLFO.type = 'sine';

    this.autoFilterLFOGain = audioContext.createGain();
    this.autoFilterLFOGain.gain.value = 1500;

    this.autoFilterDryGain = audioContext.createGain();
    this.autoFilterWetGain = audioContext.createGain();
    this.autoFilterMixNode = audioContext.createGain();

    this.autoFilterLFO.connect(this.autoFilterLFOGain);
    this.autoFilterLFOGain.connect(this.autoFilterNode.frequency);
    this.autoFilterLFO.start();

    // === TREMOLO SETUP ===
    this.tremoloGain = audioContext.createGain();
    this.tremoloGain.gain.value = 1;

    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.frequency.value = 5;
    this.tremoloLFO.type = 'sine';

    this.tremoloLFOGain = audioContext.createGain();
    this.tremoloLFOGain.gain.value = 0;

    this.tremoloDryGain = audioContext.createGain();
    this.tremoloWetGain = audioContext.createGain();
    this.tremoloMixNode = audioContext.createGain();

    this.tremoloLFO.connect(this.tremoloLFOGain);
    this.tremoloLFOGain.connect(this.tremoloGain.gain);
    this.tremoloLFO.start();

    // === STEREO WIDTH SETUP ===
    this.stereoWidthSplitter = audioContext.createChannelSplitter(2);
    this.stereoWidthMerger = audioContext.createChannelMerger(2);
    this.stereoWidthDelayL = audioContext.createDelay(0.03);
    this.stereoWidthDelayR = audioContext.createDelay(0.03);
    this.stereoWidthDelayL.delayTime.value = 0;
    this.stereoWidthDelayR.delayTime.value = 0.02;
    this.stereoWidthDryGain = audioContext.createGain();
    this.stereoWidthWetGain = audioContext.createGain();
    this.stereoWidthMixNode = audioContext.createGain();

    // === COMPRESSOR SETUP ===
    this.compressorNode = audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;
    this.compressorDryGain = audioContext.createGain();
    this.compressorWetGain = audioContext.createGain();
    this.compressorMixNode = audioContext.createGain();

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

    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Reverb setup
    this.convolverNode = audioContext.createConvolver();
    this.wetGainNode = audioContext.createGain();
    this.dryGainNode = audioContext.createGain();
    this.convolverNode.buffer = this.generateImpulseResponse(audioContext);

    // COMPLETE AUDIO CHAIN
    // Input -> Volume -> EQ -> Distortion -> Bitcrusher -> Phaser -> Flanger -> 
    // Ring Mod -> Auto-Filter -> Tremolo -> Chorus -> Delay -> Stereo Width -> 
    // Compressor -> Reverb -> Output

    this.effectsChain.connect(this.masterVolumeNode);
    this.masterVolumeNode.connect(this.bassNode);
    this.bassNode.connect(this.midNode);
    this.midNode.connect(this.trebleNode);

    // Distortion processing
    this.trebleNode.connect(this.distortionDryGain);
    this.trebleNode.connect(this.distortionNode);
    this.distortionNode.connect(this.distortionWetGain);
    this.distortionDryGain.connect(this.distortionMixNode);
    this.distortionWetGain.connect(this.distortionMixNode);

    // Bitcrusher processing
    this.distortionMixNode.connect(this.bitcrusherDryGain);
    this.distortionMixNode.connect(this.bitcrusherNode);
    this.bitcrusherNode.connect(this.bitcrusherWetGain);
    this.bitcrusherDryGain.connect(this.bitcrusherMixNode);
    this.bitcrusherWetGain.connect(this.bitcrusherMixNode);

    // Phaser processing
    this.bitcrusherMixNode.connect(this.phaserDryGain);
    this.bitcrusherMixNode.connect(this.phaserAllPass1);
    this.phaserAllPass1.connect(this.phaserAllPass2);
    this.phaserAllPass2.connect(this.phaserAllPass3);
    this.phaserAllPass3.connect(this.phaserAllPass4);
    this.phaserAllPass4.connect(this.phaserWetGain);
    this.phaserDryGain.connect(this.phaserMixNode);
    this.phaserWetGain.connect(this.phaserMixNode);

    // Flanger processing
    this.phaserMixNode.connect(this.flangerDryGain);
    this.phaserMixNode.connect(this.flangerDelayNode);
    this.flangerDelayNode.connect(this.flangerWetGain);
    this.flangerDryGain.connect(this.flangerMixNode);
    this.flangerWetGain.connect(this.flangerMixNode);

    // Ring Mod processing
    this.flangerMixNode.connect(this.ringModDryGain);
    this.flangerMixNode.connect(this.ringModGain);
    this.ringModGain.connect(this.ringModWetGain);
    this.ringModDryGain.connect(this.ringModMixNode);
    this.ringModWetGain.connect(this.ringModMixNode);

    // Auto-Filter processing
    this.ringModMixNode.connect(this.autoFilterDryGain);
    this.ringModMixNode.connect(this.autoFilterNode);
    this.autoFilterNode.connect(this.autoFilterWetGain);
    this.autoFilterDryGain.connect(this.autoFilterMixNode);
    this.autoFilterWetGain.connect(this.autoFilterMixNode);

    // Tremolo processing
    this.autoFilterMixNode.connect(this.tremoloDryGain);
    this.autoFilterMixNode.connect(this.tremoloGain);
    this.tremoloGain.connect(this.tremoloWetGain);
    this.tremoloDryGain.connect(this.tremoloMixNode);
    this.tremoloWetGain.connect(this.tremoloMixNode);

    // Chorus processing
    this.tremoloMixNode.connect(this.chorusDryGain);
    this.tremoloMixNode.connect(this.chorusDelayNode);
    this.chorusDelayNode.connect(this.chorusWetGain);
    this.chorusDryGain.connect(this.chorusMixNode);
    this.chorusWetGain.connect(this.chorusMixNode);

    // Delay processing
    this.chorusMixNode.connect(this.delayDryGain);
    this.chorusMixNode.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);
    this.delayDryGain.connect(this.delayMixNode);
    this.delayWetGain.connect(this.delayMixNode);

    // Stereo Width processing
    this.delayMixNode.connect(this.stereoWidthDryGain);
    this.delayMixNode.connect(this.stereoWidthSplitter);
    this.stereoWidthSplitter.connect(this.stereoWidthDelayL, 0);
    this.stereoWidthSplitter.connect(this.stereoWidthDelayR, 1);
    this.stereoWidthDelayL.connect(this.stereoWidthMerger, 0, 0);
    this.stereoWidthDelayR.connect(this.stereoWidthMerger, 0, 1);
    this.stereoWidthMerger.connect(this.stereoWidthWetGain);
    this.stereoWidthDryGain.connect(this.stereoWidthMixNode);
    this.stereoWidthWetGain.connect(this.stereoWidthMixNode);

    // Compressor processing
    this.stereoWidthMixNode.connect(this.compressorDryGain);
    this.stereoWidthMixNode.connect(this.compressorNode);
    this.compressorNode.connect(this.compressorWetGain);
    this.compressorDryGain.connect(this.compressorMixNode);
    this.compressorWetGain.connect(this.compressorMixNode);

    // Reverb processing
    this.compressorMixNode.connect(this.dryGainNode);
    this.compressorMixNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);

    // Final output
    this.dryGainNode.connect(audioContext.destination);
    this.wetGainNode.connect(audioContext.destination);

    // Initialize all effect levels
    this.updateReverbMix(reverbLevel);
    this.updateChorusMix(chorusLevel);
    this.updateDelayMix(delayLevel);
    this.updateDistortionMix(distortionLevel);
    this.updateBitcrusherMix(bitcrusherLevel);
    this.updatePhaserMix(phaserLevel);
    this.updateFlangerMix(flangerLevel);
    this.updateRingModMix(ringModLevel);
    this.updateAutoFilterMix(autoFilterLevel);
    this.updateTremoloMix(tremoloLevel);
    this.updateStereoWidthMix(stereoWidthLevel);
    this.updateCompressorMix(compressorLevel);
  }

  // Distortion curve generator
  private makeDistortionCurve = (amount: number): Float32Array | null => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = amount * 100;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve as Float32Array;
  }

  // And similarly for makeBitcrusherCurve:
  private makeBitcrusherCurve = (bits: number): Float32Array | null => {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const step = Math.pow(0.5, bits);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = step * Math.floor(x / step + 0.5);
    }
    return curve as Float32Array;
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

  private updateDistortionMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    this.distortionNode.curve = this.makeDistortionCurve(level) as any;
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.7);

    this.distortionDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.distortionWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateBitcrusherMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const bits = Math.floor(16 - level * 12); // 16 bits to 4 bits
    this.bitcrusherNode.curve = this.makeBitcrusherCurve(bits) as any;
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.8);

    this.bitcrusherDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.bitcrusherWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updatePhaserMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = level * 0.7;
    const dryLevel = 1 - (level * 0.3);

    this.phaserDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.phaserWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateFlangerMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = level * 0.8;
    const dryLevel = 1 - (level * 0.4);

    this.flangerDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.flangerWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateRingModMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const frequency = 50 + level * 300; // 50Hz to 350Hz
    this.ringModOscillator.frequency.setValueAtTime(frequency, currentTime);
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.6);

    this.ringModDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.ringModWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateAutoFilterMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.5);

    this.autoFilterDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.autoFilterWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateTremoloMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    this.tremoloLFOGain.gain.setValueAtTime(level * 0.5, currentTime);
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.3);

    this.tremoloDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.tremoloWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateStereoWidthMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const delayAmount = level * 0.015; // 0 to 15ms
    this.stereoWidthDelayR.delayTime.setValueAtTime(delayAmount, currentTime);
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.5);

    this.stereoWidthDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.stereoWidthWetGain.gain.setValueAtTime(wetLevel, currentTime);
  }

  private updateCompressorMix = (level: number) => {
    const currentTime = this.props.audioContext.currentTime;
    const threshold = -50 + level * 26; // -50dB to -24dB
    const ratio = 1 + level * 11; // 1:1 to 12:1
    this.compressorNode.threshold.setValueAtTime(threshold, currentTime);
    this.compressorNode.ratio.setValueAtTime(ratio, currentTime);
    const wetLevel = level;
    const dryLevel = 1 - (level * 0.4);

    this.compressorDryGain.gain.setValueAtTime(dryLevel, currentTime);
    this.compressorWetGain.gain.setValueAtTime(wetLevel, currentTime);
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
    if (prevProps.distortionLevel !== this.props.distortionLevel) {
      this.updateDistortionMix(this.props.distortionLevel);
    }
    if (prevProps.bitcrusherLevel !== this.props.bitcrusherLevel) {
      this.updateBitcrusherMix(this.props.bitcrusherLevel);
    }
    if (prevProps.phaserLevel !== this.props.phaserLevel) {
      this.updatePhaserMix(this.props.phaserLevel);
    }
    if (prevProps.flangerLevel !== this.props.flangerLevel) {
      this.updateFlangerMix(this.props.flangerLevel);
    }
    if (prevProps.ringModLevel !== this.props.ringModLevel) {
      this.updateRingModMix(this.props.ringModLevel);
    }
    if (prevProps.autoFilterLevel !== this.props.autoFilterLevel) {
      this.updateAutoFilterMix(this.props.autoFilterLevel);
    }
    if (prevProps.tremoloLevel !== this.props.tremoloLevel) {
      this.updateTremoloMix(this.props.tremoloLevel);
    }
    if (prevProps.stereoWidthLevel !== this.props.stereoWidthLevel) {
      this.updateStereoWidthMix(this.props.stereoWidthLevel);
    }
    if (prevProps.compressorLevel !== this.props.compressorLevel) {
      this.updateCompressorMix(this.props.compressorLevel);
    }
  }

  loadInstrument = (instrumentName: string) => {
    this.setState({ instrument: null });

    Soundfont.instrument(this.props.audioContext, instrumentName as any, {
      format: this.props.format,
      soundfont: this.props.soundfont,
      nameToUrl: (name: any, soundfont: any, format: any) => `${this.props.hostname}/${soundfont}/${name}-${format}.js`,
      destination: this.effectsChain,
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