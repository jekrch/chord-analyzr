// A small polyphonic electric-piano synth — no samples, no network, so pads
// sound the instant they're pressed. Each note is a lightly FM'd sine (the
// warm body), a fast-fading inharmonic "tine" partial for the attack, and an
// amp envelope that decays to silence on its own. Voices schedule their own
// stop time, so a note can never ring forever even if nothing releases it.
// Playing a chord still releases the previous one, autoharp-style.

interface Voice {
  oscs: OscillatorNode[];
  gain: GainNode;
}

const RELEASE_S = 0.3;

// Amp-envelope decay time constant in seconds — lower notes ring longer,
// like real tines.
const decayFor = (midi: number) =>
  Math.min(3.5, Math.max(1.1, 2.2 * Math.pow(2, (60 - midi) / 24)));

// How long a note remains audible, in ms: the tail has slipped under
// hearing by ~2.5 time constants. Keeps keybed lighting in sync with
// what's actually sounding.
export const noteRingMs = (midi: number) => decayFor(midi) * 2500;

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private volume = 0.7;
  private muted = false;

  // The AudioContext is created lazily, inside the first user gesture, so
  // the browser never blocks it as autoplay.
  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.applyGain();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGain();
  }

  private applyGain() {
    if (!this.ctx || !this.master) return;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  // Strum through the notes with a small stagger so chords bloom instead of
  // clicking on all at once.
  playNotes(midis: number[], strumMs = 14) {
    if (midis.length === 0) return;
    const ctx = this.ensure();
    this.releaseAll();
    const level = 0.4 / Math.sqrt(Math.max(midis.length, 3));
    midis.forEach((midi, i) => {
      const at = ctx.currentTime + (i * strumMs) / 1000;
      this.startVoice(ctx, midi, at, level);
    });
  }

  private startVoice(ctx: AudioContext, midi: number, at: number, level: number) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const decay = decayFor(midi);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.004);
    gain.gain.setTargetAtTime(0, at + 0.004, decay);
    gain.connect(this.master!);

    // body: a sine carrier FM'd by a same-pitch modulator whose depth fades
    // quickly — the bark of the attack mellowing into a pure tone
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq;
    const modDepth = ctx.createGain();
    modDepth.gain.setValueAtTime(freq * 1.1, at);
    modDepth.gain.setTargetAtTime(freq * 0.08, at + 0.005, 0.25);
    mod.connect(modDepth);
    modDepth.connect(carrier.frequency);
    carrier.connect(gain);

    // tine: a quiet, slightly inharmonic high partial with a very quick decay
    const tine = ctx.createOscillator();
    tine.type = 'sine';
    tine.frequency.value = freq * 3.97;
    const tineGain = ctx.createGain();
    tineGain.gain.setValueAtTime(0.5, at);
    tineGain.gain.setTargetAtTime(0, at, 0.07);
    tine.connect(tineGain);
    tineGain.connect(gain);

    const voice: Voice = { oscs: [carrier, mod, tine], gain };
    const stopAt = at + decay * 4;
    for (const osc of voice.oscs) {
      osc.start(at);
      osc.stop(stopAt);
    }
    carrier.onended = () => {
      this.voices.delete(voice);
      gain.disconnect();
    };
    this.voices.add(voice);
  }

  releaseAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, RELEASE_S / 4);
      for (const osc of voice.oscs) {
        try {
          osc.stop(now + RELEASE_S);
        } catch {
          // already stopped
        }
      }
    }
    this.voices.clear();
  }
}
