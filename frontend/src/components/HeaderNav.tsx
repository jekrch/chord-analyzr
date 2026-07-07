import React, { useState, useRef, useEffect } from 'react';
import { InformationCircleIcon, QuestionMarkCircleIcon, EllipsisVerticalIcon, SwatchIcon } from '@heroicons/react/20/solid';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import ThemeSettingsModal from './ThemeSettingsModal';
import { useMusicStore } from '../stores/musicStore';
import Logo from './Logo';


const HeaderNav: React.FC = () => {
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const musicStore = useMusicStore();

    const { 
        key,
        mode
    } = musicStore;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuItemClick = (action: () => void) => {
        action();
        setIsDropdownOpen(false);
    };

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

                            {/* Dropdown Menu */}
                            <div className="relative">
                                <button
                                    ref={buttonRef}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-8 h-8 flex items-center justify-center text-mcb-tertiary hover:text-mcb-primary hover:bg-mcb-hover rounded-md transition-all duration-200 border border-transparent hover:border-mcb-primary"
                                    title="Menu"
                                >
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div
                                        ref={dropdownRef}
                                        className="absolute right-0 mt-2 w-64 mcb-panel !rounded-lg z-50 overflow-hidden"
                                    >

                                        {/* Menu Items */}
                                        <div className="py-2">
                                            <button
                                                onClick={() => handleMenuItemClick(() => setShowThemeModal(true))}
                                                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-all duration-150"
                                            >
                                                <SwatchIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">Theme</span>
                                            </button>
                                            <button
                                                onClick={() => handleMenuItemClick(() => setShowAboutModal(true))}
                                                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-all duration-150"
                                            >
                                                <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">About</span>
                                            </button>
                                            <button
                                                onClick={() => handleMenuItemClick(() => setShowHelpModal(true))}
                                                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-all duration-150"
                                            >
                                                <QuestionMarkCircleIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">Help</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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