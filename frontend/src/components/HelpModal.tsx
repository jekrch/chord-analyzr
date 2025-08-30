import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import Modal from './Modal';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpSection: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-[#2a2f38] rounded-lg border border-gray-600 overflow-hidden mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left bg-[#444b59] border-b border-gray-600 hover:bg-[#4a5262] transition-all duration-200"
            >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                    {title}
                </h4>
                {isOpen ? (
                    <ChevronDownIcon className="w-4 h-4 text-slate-300 flex-shrink-0" />
                ) : (
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 text-slate-300">
                    {children}
                </div>
            )}
        </div>
    );
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Help & Guide"
            className="max-w-4xl max-h-[85vh]"
            fixedHeader={true}
        >
            <div className="p-6 space-y-4">
                
                <HelpSection 
                    title="Quick Start" 
                    defaultOpen={true}
                >
                    <div className="space-y-4">
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#3d434f]/30 hover:bg-[#3d434f]/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                1
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Choose a Key & Mode</div>
                                <div className="text-sm text-slate-300">Use the Controls section to select your musical key and mode (like C Major, A Minor, etc.)</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#3d434f]/30 hover:bg-[#3d434f]/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                2
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Explore Chords</div>
                                <div className="text-sm text-slate-300">Browse the Chord Explorer below to discover chords that fit your chosen key/mode</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#3d434f]/30 hover:bg-[#3d434f]/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                3
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Build Sequences</div>
                                <div className="text-sm text-slate-300">Click the + button on chords to add them to your sequence</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#3d434f]/30 hover:bg-[#3d434f]/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                4
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Create Patterns</div>
                                <div className="text-sm text-slate-300">Use the Sequencer to create rhythmic patterns for your chords</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#3d434f]/30 hover:bg-[#3d434f]/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                5
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Play & Perform</div>
                                <div className="text-sm text-slate-300">Hit Play to hear your creation, or use Live Mode for real-time performance</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Keyboard Shortcuts">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="text-white font-semibold text-sm border-b border-gray-600 pb-2 text-left">Playback Control</h5>
                            <div className="flex items-center justify-between p-2 rounded-md bg-[#3d434f]/30">
                                <span className="text-sm text-left">Play/Pause sequencer</span>
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">Space</kbd>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-white font-semibold text-sm border-b border-gray-600 pb-2 text-left">Navigation</h5>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 rounded-md bg-[#3d434f]/30">
                                    <span className="text-sm text-left">Expand chord buttons</span>
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">L</kbd>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-[#3d434f]/30">
                                    <span className="text-sm text-left">Select chord from sequence</span>
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">1-9</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Piano & Audio Controls">
                    <div className="space-y-6">
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Piano Interaction</h5>
                            <p className="text-sm text-left">Click piano keys to play individual notes. The piano highlights scale notes and chord tones based on your current selection.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Audio Settings</h5>
                            <p className="text-sm mb-3 text-left">Access comprehensive audio controls through the Settings panel in the Controls section:</p>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Voice:</strong> <span className="text-slate-300">Choose from multiple instrument sounds</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Volume & Octave:</strong> <span className="text-slate-300">Adjust overall volume and pitch range</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Effects:</strong> <span className="text-slate-300">Add reverb, chorus, and delay</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Equalizer:</strong> <span className="text-slate-300">Shape the sound with bass, mid, and treble controls</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Note Duration:</strong> <span className="text-slate-300">Control how long notes ring out</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Pattern Sequencer">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Understanding Patterns</h5>
                            <p className="text-sm mb-3 text-left">Patterns control which chord tones play at different time steps. Each step can be:</p>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">—</code>
                                    <span className="text-sm text-slate-300 text-left">Rest/silence</span>
                                </div>
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">1, 2, 3...</code>
                                    <span className="text-sm text-slate-300 text-left">Play the 1st, 2nd, 3rd... note of the chord</span>
                                </div>
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">1↑, 2↑...</code>
                                    <span className="text-sm text-slate-300 text-left">Play the note one octave higher</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-[#3d434f]/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Pattern Controls</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Add/Remove Steps:</strong> Use the +/- buttons to change pattern length</div>
                                    <div><strong className="text-white">Pattern Presets:</strong> Choose from pre-built patterns or create your own</div>
                                    <div><strong className="text-white">Timing:</strong> Adjust BPM, subdivision, and swing feel</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Chord Explorer & Sequences">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Finding Chords</h5>
                            <p className="text-sm mb-3 text-left">The Chord Explorer shows all chords that fit your selected key and mode. You can:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Filter by root note</strong> to find specific chord types</div>
                                <div><strong className="text-white">Search</strong> for chord names or note combinations</div>
                                <div><strong className="text-white">Click to preview</strong> any chord</div>
                                <div><strong className="text-white">Click ↓</strong> to see the individual notes in a chord</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Building Sequences</h5>
                            <p className="text-sm mb-3 text-left">Add chords to your sequence using the <span className="text-green-400 font-bold">+</span> button. Your chord sequence appears at the bottom where you can:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div>Click any chord to play it immediately</div>
                                <div>Use numbers 1-9 to jump between chords</div>
                                <div>Toggle Delete mode to remove unwanted chords</div>
                                <div>Clear all chords to start fresh</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Live Mode">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Performance Mode</h5>
                            <p className="text-sm mb-3 text-left">Live Mode expands your chord sequence into a full-screen performance interface perfect for:</p>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Live performance:</strong> <span className="text-slate-300">Large, touch-friendly chord buttons</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Practice sessions:</strong> <span className="text-slate-300">Easy chord switching with visual feedback</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-[#2a2f38]">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Composition:</strong> <span className="text-slate-300">Hear chord progressions in real-time</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Using Live Mode</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div>Click "Expand" in the chord sequence to enter Live Mode</div>
                                <div>Use keyboard numbers 1-9 or click/tap chord buttons</div>
                                <div>The sequencer continues playing your patterns</div>
                                <div>Active chord is highlighted in blue</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Interface Tips">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-[#3d434f]/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Navigation</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Sequencer Header:</strong> Click to show/hide the pattern editor</div>
                                    <div><strong className="text-white">Settings Panels:</strong> Most sections have expandable settings</div>
                                    <div><strong className="text-white">Status Indicators:</strong> Top bar shows current key, mode, and playback status</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-[#3d434f]/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Visual Feedback</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Piano Keys:</strong> Scale notes are highlighted in blue</div>
                                    <div><strong className="text-white">Chord Tones:</strong> Active chord notes show in brighter colors</div>
                                    <div><strong className="text-white">Step Indicator:</strong> Shows current position in the pattern</div>
                                    <div><strong className="text-white">Animations:</strong> Visual feedback for chord changes and playback</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#3d434f]/30 mt-4">
                        <h5 className="text-white font-semibold mb-3 text-sm text-left">Responsive Design</h5>
                        <p className="text-sm text-left">The interface adapts to different screen sizes. On mobile devices, some controls are simplified and touch-optimized for better usability.</p>
                    </div>
                </HelpSection>

                <HelpSection title="Troubleshooting">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Audio Issues</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">No sound:</strong> Check device volume and ensure audio isn't muted</div>
                                <div><strong className="text-white">iOS devices:</strong> Tap any button first to initialize audio</div>
                                <div><strong className="text-white">Distorted audio:</strong> Lower the volume setting in piano controls</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#3d434f]/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Performance</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Lag or glitches:</strong> Close other browser tabs using audio</div>
                                <div><strong className="text-white">Mobile performance:</strong> Use lower reverb/effect settings for better performance</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-600/50">
                    <p className="text-xs text-slate-400 text-left">
                        Need more help? Check the GitHub repository for detailed documentation and examples.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default HelpModal;