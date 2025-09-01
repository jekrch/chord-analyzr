import { create } from 'zustand';

interface UIState {
    // State
    isDeleteMode: boolean;
    isLiveMode: boolean;
    showPatternSystem: boolean;
    
    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => void;
    setIsLiveMode: (isLiveMode: boolean) => void;
    setShowPatternSystem: (showPatternSystem: boolean) => void;
    toggleDeleteMode: () => void;
    toggleLiveMode: () => void;
    togglePatternSystem: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    isDeleteMode: false,
    isLiveMode: false,
    showPatternSystem: false,

    // Actions
    setIsDeleteMode: (isDeleteMode: boolean) => set({ isDeleteMode }),
    setIsLiveMode: (isLiveMode: boolean) => set({ isLiveMode }),
    setShowPatternSystem: (showPatternSystem: boolean) => set({ showPatternSystem }),
    toggleDeleteMode: () => set(state => ({ isDeleteMode: !state.isDeleteMode })),
    toggleLiveMode: () => set(state => ({ isLiveMode: !state.isLiveMode })),
    togglePatternSystem: () => set(state => ({ showPatternSystem: !state.showPatternSystem })),
}));