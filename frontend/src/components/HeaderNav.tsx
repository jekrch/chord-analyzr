import React, { useState } from 'react';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import ThemeSettingsModal from './ThemeSettingsModal';
import FullScreenMenu from './FullScreenMenu';
import { useMusicStore } from '../stores/musicStore';
import Logo from './Logo';


const HeaderNav: React.FC = () => {
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const musicStore = useMusicStore();

    const {
        key,
        mode
    } = musicStore;

    const handleOpenHelp = () => {
        setShowHelpModal(true);
    };

    return (
        <>
            <div className="bg-mcb-elevated border-b border-mcb-subtle shadow-[0_1px_0_rgba(0,0,0,0.3)]">
                <div className="relative">
                    <div className="flex items-center justify-between px-4 py-2">
                        {/* Left side - App Name with Geometric Logo */}
                        <div className="flex items-center space-x-3">
                            <Logo size={30}/>

                            {/* App Name */}
                            <div className="flex items-baseline space-x-2">
                                <h1 className="text-base font-bold text-[var(--mcb-accent-primary)] tracking-tight leading-none">
                                    modal
                                </h1>
                                <div className="flex items-center space-x-1">
                                    <span className="mcb-label">chord</span>
                                    <div className="w-0.5 h-0.5 bg-[var(--mcb-text-tertiary)] rounded-full"></div>
                                    <span className="mcb-label">buildr</span>
                                </div>
                            </div>
                        </div>

                        {/* Center/Right - Status and Key/Mode (Desktop) and Menu */}
                        <div className="flex items-center space-x-3">

                            {/* Key/Mode Display - Hidden on small screens */}
                            <div className="hidden sm:flex items-center mcb-inset px-3 py-1 space-x-2 font-mono text-xs text-mcb-secondary">
                                <span className="mcb-label !text-[0.5625rem]">key</span>
                                <span className="text-[var(--mcb-accent-text-primary)]">{key}</span>
                                <div className="w-px h-3 bg-[var(--mcb-border-primary)]"></div>
                                <span className="text-mcb-secondary">{mode}</span>
                            </div>

                            {/* Menu Trigger */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`mcb-burger ${isMenuOpen ? 'is-open' : ''} text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover rounded-md transition-all duration-200 border border-transparent hover:border-mcb-primary`}
                                title="Menu"
                                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={isMenuOpen}
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <FullScreenMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onOpenTheme={() => setShowThemeModal(true)}
                onOpenAbout={() => setShowAboutModal(true)}
                onOpenHelp={() => setShowHelpModal(true)}
            />

            <AboutModal
                isOpen={showAboutModal}
                onClose={() => setShowAboutModal(false)}
                onOpenHelp={handleOpenHelp}
            />
            <HelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />
            <ThemeSettingsModal
                isOpen={showThemeModal}
                onClose={() => setShowThemeModal(false)}
            />
        </>
    );
};

export default HeaderNav;
