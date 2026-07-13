import { beforeEach, describe, expect, it } from 'vitest';
import { usePianoStore } from './pianoStore';

// Snapshot the pristine store so each test starts from defaults.
const INITIAL = {
    pianoSettings: { ...usePianoStore.getState().pianoSettings, eq: { ...usePianoStore.getState().pianoSettings.eq } },
    availableInstruments: [...usePianoStore.getState().availableInstruments],
};

beforeEach(() => {
    usePianoStore.setState({
        pianoSettings: { ...INITIAL.pianoSettings, eq: { ...INITIAL.pianoSettings.eq } },
        availableInstruments: [...INITIAL.availableInstruments],
    });
});

describe('pianoStore', () => {
    it('updatePianoSettings merges a partial patch', () => {
        usePianoStore.getState().updatePianoSettings({ volume: 0.3, octaveOffset: 2 });
        const s = usePianoStore.getState().pianoSettings;
        expect(s.volume).toBe(0.3);
        expect(s.octaveOffset).toBe(2);
        // an untouched field keeps its default
        expect(s.instrumentName).toBe('electric_piano_1');
    });

    it('routes each single-field setter through updatePianoSettings', () => {
        const s = usePianoStore.getState();
        s.setPianoInstrument('harpsichord');
        s.setCutOffPreviousNotes(false);
        s.setOctaveOffset(-1);
        s.setReverbLevel(0.5);
        s.setNoteDuration(1.2);
        s.setVolume(0.6);

        const settings = usePianoStore.getState().pianoSettings;
        expect(settings.instrumentName).toBe('harpsichord');
        expect(settings.cutOffPreviousNotes).toBe(false);
        expect(settings.octaveOffset).toBe(-1);
        expect(settings.reverbLevel).toBe(0.5);
        expect(settings.noteDuration).toBe(1.2);
        expect(settings.volume).toBe(0.6);
    });

    it('setEq replaces the whole eq object', () => {
        usePianoStore.getState().setEq({ bass: 4, mid: -3, treble: 2 });
        expect(usePianoStore.getState().pianoSettings.eq).toEqual({ bass: 4, mid: -3, treble: 2 });
    });

    it('sets each effect level independently', () => {
        const s = usePianoStore.getState();
        s.setChorusLevel(0.1);
        s.setDelayLevel(0.2);
        s.setDistortionLevel(0.3);
        s.setBitcrusherLevel(0.4);
        s.setPhaserLevel(0.5);
        s.setFlangerLevel(0.6);
        s.setRingModLevel(0.7);
        s.setAutoFilterLevel(0.8);
        s.setTremoloLevel(0.9);
        s.setStereoWidthLevel(0.15);
        s.setCompressorLevel(0.25);

        const e = usePianoStore.getState().pianoSettings;
        expect(e.chorusLevel).toBe(0.1);
        expect(e.delayLevel).toBe(0.2);
        expect(e.distortionLevel).toBe(0.3);
        expect(e.bitcrusherLevel).toBe(0.4);
        expect(e.phaserLevel).toBe(0.5);
        expect(e.flangerLevel).toBe(0.6);
        expect(e.ringModLevel).toBe(0.7);
        expect(e.autoFilterLevel).toBe(0.8);
        expect(e.tremoloLevel).toBe(0.9);
        expect(e.stereoWidthLevel).toBe(0.15);
        expect(e.compressorLevel).toBe(0.25);
    });

    it('replaces the available instrument list', () => {
        usePianoStore.getState().setAvailableInstruments(['organ', 'flute']);
        expect(usePianoStore.getState().availableInstruments).toEqual(['organ', 'flute']);
    });
});
