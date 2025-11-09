import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Button } from './Button';

interface ThemeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ThemeName = 'default' | 'forest' | 'neon' | 'sunset';

interface Theme {
    id: ThemeName;
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
    };
}

const THEMES: Theme[] = [
    {
        id: 'default',
        name: 'Default',
        description: 'Classic blue and gray theme',
        colors: {
            primary: '#3b82f6',
            secondary: '#3d434f',
            accent: '#60a5fa',
        },
    },
    {
        id: 'forest',
        name: 'Forest',
        description: 'Calming green and earth tones',
        colors: {
            primary: '#10b981',
            secondary: '#2d4436',
            accent: '#34d399',
        },
    },
    {
        id: 'neon',
        name: 'Neon',
        description: 'Synthwave purple for late-night sessions',
        colors: {
            primary: '#a855f7',
            secondary: '#2d1f3d',
            accent: '#c084fc',
        },
    },
    {
        id: 'sunset',
        name: 'Sunset',
        description: 'Warm orange vibes for studio sessions',
        colors: {
            primary: '#f97316',
            secondary: '#3d2a21',
            accent: '#fb923c',
        },
    },
];

const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose }) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('mcb-theme') as ThemeName;
        if (savedTheme && ['default', 'forest', 'neon', 'sunset'].includes(savedTheme)) {
            setCurrentTheme(savedTheme);
            applyTheme(savedTheme);
        }
    }, []);

    const applyTheme = (themeName: ThemeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('mcb-theme', themeName);
    };

    const handleThemeChange = (themeName: ThemeName) => {
        setCurrentTheme(themeName);
        applyTheme(themeName);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Theme Settings"
            className="max-w-2xl"
        >
            <div className="p-6 space-y-6">
                {/* Description */}
                <div className="bg-mcb-primary rounded-lg border border-[var(--mcb-border-primary)] p-4">
                    <p className="text-sm text-[var(--mcb-text-secondary)] text-left leading-relaxed">
                        Choose a color theme that suits your preference. Your selection will be saved and applied automatically when you return.
                    </p>
                </div>

                {/* Theme Options */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wide text-left">
                        Available Themes
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => handleThemeChange(theme.id)}
                                className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                    currentTheme === theme.id
                                        ? 'border-[var(--mcb-accent-primary)] bg-[var(--mcb-bg-secondary)] shadow-lg shadow-[var(--mcb-accent-light)]'
                                        : ' border-[var(--mcb-border-primary)] bg-[var(--mcb-bg-primary)] hover:border-[var(--mcb-border-secondary)] hover:bg-[var(--mcb-bg-secondary)]'
                                }`}
                            >
                                {/* Selected Indicator */}
                                {currentTheme === theme.id && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-5 h-5 rounded-full bg-[var(--mcb-accent-primary)] flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {/* Theme Name */}
                                <div className="mb-2 pr-6">
                                    <h4 className="text-sm font-bold text-white">{theme.name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">{theme.description}</p>
                                </div>

                                {/* Color Preview */}
                                <div className="flex items-center space-x-2 mt-3">
                                    <div className="flex-1 space-y-1">
                                        <div
                                            className="h-5 rounded border  border-[var(--mcb-border-primary)]"
                                            style={{ backgroundColor: theme.colors.primary }}
                                            title="Accent Color"
                                        />
                                        <div
                                            className="h-3 rounded border  border-[var(--mcb-border-primary)]"
                                            style={{ backgroundColor: theme.colors.secondary }}
                                            title="Background Color"
                                        />
                                    </div>
                                    <div className="text-xs text-[var(--mcb-text-disabled)] flex-shrink-0">
                                        Preview
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Live Preview Section */}
                <div className="bg-mcb-primary rounded-lg border  border-[var(--mcb-border-primary)] overflow-hidden">
                    <div className="bg-[var(--mcb-bg-tertiary)] px-4 py-3 border-b  border-[var(--mcb-border-primary)]">
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                            Live Preview
                        </h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="bg-[var(--mcb-bg-secondary)] border border-[var(--mcb-border-primary)] rounded-lg p-3">
                            <div className="text-sm text-[var(--mcb-text-primary)] mb-2">Sample Content</div>
                            <div className="flex items-center space-x-2">
                                <Button variant="primary" size="sm">
                                    Accent Button
                                </Button>
                                <Button variant="secondary" size="sm">
                                    Secondary
                                </Button>
                                <Button variant="success" size="sm">
                                    Success
                                </Button>
                            </div>
                        </div>
                        <div className="text-xs text-[var(--mcb-text-tertiary)] text-center">
                            This preview updates as you select different themes
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="pt-4 border-t  border-[var(--mcb-border-primary)]/50">
                    <p className="text-xs text-[var(--mcb-text-primary)] text-left">
                        💡 Your theme preference is saved locally and will persist between sessions.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default ThemeSettingsModal;