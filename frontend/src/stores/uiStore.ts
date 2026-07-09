import { create } from 'zustand';

export type KeyboardDisplayMode = 'keyboard' | 'notation' | 'both';

interface UIState {
    // State
    isDeleteMode: boolean;
    isLiveMode: boolean;
    showPatternSystem: boolean;
    keyboardDisplayMode: KeyboardDisplayMode;
    pinKeyboardDisplay: boolean;
    // Height (px) of the pinned keyboard/score display; 0 when unpinned.
    // Other sticky elements offset their `top` by this so they stop below it.
    pinnedDisplayHeight: number;

    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => void;
    setIsLiveMode: (isLiveMode: boolean) => void;
    setShowPatternSystem: (showPatternSystem: boolean) => void;
    setKeyboardDisplayMode: (keyboardDisplayMode: KeyboardDisplayMode) => void;
    setPinKeyboardDisplay: (pinKeyboardDisplay: boolean) => void;
    setPinnedDisplayHeight: (pinnedDisplayHeight: number) => void;
    toggleDeleteMode: () => void;
    toggleLiveMode: () => void;
    togglePatternSystem: () => void;
    togglePinKeyboardDisplay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    isDeleteMode: false,
    isLiveMode: false,
    showPatternSystem: false,
    keyboardDisplayMode: 'keyboard',
    pinKeyboardDisplay: false,
    pinnedDisplayHeight: 0,

    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => set({ isDeleteMode }),
    setKeyboardDisplayMode: (keyboardDisplayMode: KeyboardDisplayMode) => set({ keyboardDisplayMode }),
    setPinKeyboardDisplay: (pinKeyboardDisplay: boolean) => set({ pinKeyboardDisplay }),
    setPinnedDisplayHeight: (pinnedDisplayHeight: number) => set({ pinnedDisplayHeight }),
    setIsLiveMode: (isLiveMode: boolean) => set({ isLiveMode }),
    setShowPatternSystem: (showPatternSystem: boolean) => set({ showPatternSystem }),
    toggleDeleteMode: () => set(state => ({ isDeleteMode: !state.isDeleteMode })),
    toggleLiveMode: () => set(state => ({ isLiveMode: !state.isLiveMode })),
    togglePatternSystem: () => set(state => ({ showPatternSystem: !state.showPatternSystem })),
    togglePinKeyboardDisplay: () => set(state => ({ pinKeyboardDisplay: !state.pinKeyboardDisplay })),
}));