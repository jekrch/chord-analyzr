import { beforeEach, describe, expect, it } from 'vitest';
import { usePatternStore } from './patternStore';

const DEFAULT_PATTERN = ['1', '2', '3', '4'];

beforeEach(() => {
    usePatternStore.setState({
        globalPatternState: {
            currentPattern: [...DEFAULT_PATTERN],
            isPlaying: false,
            bpm: 120,
            subdivision: 0.25,
            swing: 0,
            currentStep: 0,
            repeat: true,
            lastChordChangeTime: 0,
            globalClockStartTime: 0,
        },
        currentlyActivePattern: [...DEFAULT_PATTERN],
    });
});

describe('patternStore', () => {
    it('merges partial updates into globalPatternState', () => {
        usePatternStore.getState().setGlobalPatternState({ bpm: 90, swing: 15 });
        const gps = usePatternStore.getState().globalPatternState;
        expect(gps.bpm).toBe(90);
        expect(gps.swing).toBe(15);
        // untouched fields survive the merge
        expect(gps.currentPattern).toEqual(DEFAULT_PATTERN);
        expect(gps.subdivision).toBe(0.25);
    });

    it('replaces the currently active pattern', () => {
        usePatternStore.getState().setCurrentlyActivePattern(['x', '1', 'x', '2']);
        expect(usePatternStore.getState().currentlyActivePattern).toEqual(['x', '1', 'x', '2']);
    });

    it('togglePlayback flips isPlaying without touching other fields', () => {
        usePatternStore.getState().togglePlayback();
        expect(usePatternStore.getState().globalPatternState.isPlaying).toBe(true);
        expect(usePatternStore.getState().globalPatternState.bpm).toBe(120);
        usePatternStore.getState().togglePlayback();
        expect(usePatternStore.getState().globalPatternState.isPlaying).toBe(false);
    });

    it('updatePattern behaves as a partial merge', () => {
        usePatternStore.getState().updatePattern({ currentStep: 3, isPlaying: true });
        const gps = usePatternStore.getState().globalPatternState;
        expect(gps.currentStep).toBe(3);
        expect(gps.isPlaying).toBe(true);
        expect(gps.bpm).toBe(120);
    });
});
