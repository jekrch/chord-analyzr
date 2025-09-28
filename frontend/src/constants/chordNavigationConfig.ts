export const CHORD_NAVIGATION_CONFIG = {
    // CSS for preventing mobile browser interference during drag
    DRAG_STYLES: `
        .dragging {
            overflow: hidden !important;
            touch-action: none !important;
            overscroll-behavior: none !important;
            -webkit-overflow-scrolling: auto !important;
        }
        
        .dragging * {
            pointer-events: none !important;
        }
        
        .dragging .mobile-drag-item,
        .dragging .mobile-drag-item * {
            pointer-events: auto !important;
        }
        
        @media (max-width: 768px) {
            .dragging {
                -webkit-user-select: none !important;
                user-select: none !important;
            }
        }
    `,

    // Octave ranges
    START_OCTAVE: 4,
    END_OCTAVE: 7,

    // Grid layout configurations
    GRID_CLASSES: {
        LIVE_MODE: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max pt-0",
        COLLAPSED_MODE: "flex space-x-2 overflow-x-auto pb-2 chord-sequence-scroll -mx-2 px-2"
    },

    // Button size configurations
    BUTTON_SIZES: {
        LIVE_DESKTOP: {
            container: 'py-8 px-6 text-lg min-h-[120px] flex flex-col items-center justify-center',
            number: 'text-xl mb-2',
            name: 'text-base text-center text-white',
            icon: 'h-6 w-6'
        },
        LIVE_MOBILE: {
            container: 'py-8 px-6 text-lg min-h-[140px] flex flex-col items-center justify-center',
            number: 'text-xl mb-2',
            name: 'text-base text-center text-white',
            icon: 'h-6 w-6'
        },
        COLLAPSED: {
            container: 'py-4 px-2 text-sm min-w-[85px] bottom-nav-button chord-button space-x-1 mt-1 min-h-[60px] !min-w-[70px] flex flex-col items-center justify-center',
            number: 'text-xs mb-1',
            name: 'text-xs',
            icon: 'h-4 w-4'
        }
    },

    // Color themes
    COLORS: {
        PRIMARY_BG: '#1a1e24',
        SECONDARY_BG: '#2a2f38',
        ACCENT_BG: '#4a5262',
        ACCENT_HOVER: '#525a6b',
        BORDER: 'border-gray-600',
        TEXT_PRIMARY: 'text-white',
        TEXT_SECONDARY: 'text-slate-300',
        TEXT_MUTED: 'text-slate-400',
        BLUE_PRIMARY: 'text-blue-200',
        BLUE_ACCENT: 'text-blue-400'
    },

    // Responsive breakpoints for compact height
    COMPACT_HEIGHT_THRESHOLD: 35, // em units

    // Timing configurations
    HIGHLIGHT_DURATION: 150,
    ORIENTATION_CHANGE_DELAY: 300,
    
    // Mobile detection patterns
    MOBILE_USER_AGENTS: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
};