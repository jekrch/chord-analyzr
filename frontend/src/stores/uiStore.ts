import { create } from 'zustand';

export type KeyboardDisplayMode = 'keyboard' | 'notation' | 'both';

interface UIState {
    // State
    isDeleteMode: boolean;
    isLiveMode: boolean;
    showPatternSystem: boolean;
    keyboardDisplayMode: KeyboardDisplayMode;
    pinKeyboardDisplay: boolean;

    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => void;
    setIsLiveMode: (isLiveMode: boolean) => void;
    setShowPatternSystem: (showPatternSystem: boolean) => void;
    setKeyboardDisplayMode: (keyboardDisplayMode: KeyboardDisplayMode) => void;
    setPinKeyboardDisplay: (pinKeyboardDisplay: boolean) => void;
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

    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => set({ isDeleteMode }),
    setKeyboardDisplayMode: (keyboardDisplayMode: KeyboardDisplayMode) => set({ keyboardDisplayMode }),
    setPinKeyboardDisplay: (pinKeyboardDisplay: boolean) => set({ pinKeyboardDisplay }),
    setIsLiveMode: (isLiveMode: boolean) => set({ isLiveMode }),
    setShowPatternSystem: (showPatternSystem: boolean) => set({ showPatternSystem }),
    toggleDeleteMode: () => set(state => ({ isDeleteMode: !state.isDeleteMode })),
    toggleLiveMode: () => set(state => ({ isLiveMode: !state.isLiveMode })),
    togglePatternSystem: () => set(state => ({ showPatternSystem: !state.showPatternSystem })),
    togglePinKeyboardDisplay: () => set(state => ({ pinKeyboardDisplay: !state.pinKeyboardDisplay })),
}));