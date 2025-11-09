/**
 * Theme Initialization
 * This file should be imported at the top of your App.tsx or index.tsx
 */

export type ThemeName = 'default' | 'forest' | 'neon' | 'sunset';

export const initializeTheme = () => {
    const savedTheme = localStorage.getItem('mcb-theme') as ThemeName | null;
    
    if (savedTheme && ['default', 'forest', 'neon', 'sunset'].includes(savedTheme)) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Default theme
        document.documentElement.setAttribute('data-theme', 'default');
    }
};

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
    initializeTheme();
}