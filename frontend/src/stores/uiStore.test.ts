import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './uiStore';

const INITIAL = useUIStore.getState();

beforeEach(() => {
    useUIStore.setState({
        isDeleteMode: false,
        isLiveMode: false,
        isCompactChords: false,
        showPatternSystem: false,
        keyboardDisplayMode: 'keyboard',
        pinKeyboardDisplay: false,
        pinnedDisplayHeight: 0,
    });
});

describe('uiStore setters', () => {
    it('sets each boolean flag directly', () => {
        const s = useUIStore.getState();
        s.setIsDeleteMode(true);
        s.setIsLiveMode(true);
        s.setIsCompactChords(true);
        s.setShowPatternSystem(true);
        s.setPinKeyboardDisplay(true);
        const state = useUIStore.getState();
        expect(state.isDeleteMode).toBe(true);
        expect(state.isLiveMode).toBe(true);
        expect(state.isCompactChords).toBe(true);
        expect(state.showPatternSystem).toBe(true);
        expect(state.pinKeyboardDisplay).toBe(true);
    });

    it('sets the keyboard display mode and pinned height', () => {
        useUIStore.getState().setKeyboardDisplayMode('both');
        useUIStore.getState().setPinnedDisplayHeight(120);
        expect(useUIStore.getState().keyboardDisplayMode).toBe('both');
        expect(useUIStore.getState().pinnedDisplayHeight).toBe(120);
    });
});

describe('uiStore togglers', () => {
    it('each toggle flips only its own flag', () => {
        useUIStore.getState().toggleDeleteMode();
        expect(useUIStore.getState().isDeleteMode).toBe(true);
        useUIStore.getState().toggleDeleteMode();
        expect(useUIStore.getState().isDeleteMode).toBe(false);

        useUIStore.getState().toggleLiveMode();
        expect(useUIStore.getState().isLiveMode).toBe(true);

        useUIStore.getState().toggleCompactChords();
        expect(useUIStore.getState().isCompactChords).toBe(true);

        useUIStore.getState().togglePatternSystem();
        expect(useUIStore.getState().showPatternSystem).toBe(true);

        useUIStore.getState().togglePinKeyboardDisplay();
        expect(useUIStore.getState().pinKeyboardDisplay).toBe(true);

        // untouched flags stay put
        expect(useUIStore.getState().keyboardDisplayMode).toBe('keyboard');
        expect(useUIStore.getState().pinnedDisplayHeight).toBe(0);
    });
});

describe('uiStore defaults', () => {
    it('starts with everything off and keyboard-only display', () => {
        expect(INITIAL.isDeleteMode).toBe(false);
        expect(INITIAL.isLiveMode).toBe(false);
        expect(INITIAL.keyboardDisplayMode).toBe('keyboard');
    });
});
