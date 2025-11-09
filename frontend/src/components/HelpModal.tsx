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
        <div className="bg-mcb-primary rounded-lg border border-mcb-primary overflow-hidden mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left bg-mcb-tertiary border-b border-mcb-primary hover:bg-mcb-hover transition-all duration-200"
            >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                    {title}
                </h4>
                {isOpen ? (
                    <ChevronDownIcon className="w-4 h-4 text-mcb-secondary flex-shrink-0" />
                ) : (
                    <ChevronRightIcon className="w-4 h-4 text-mcb-secondary flex-shrink-0" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 text-mcb-secondary">
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
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-mcb-secondary/30 hover:bg-mcb-secondary/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] text-white text-sm font-bold flex-shrink-0">
                                1
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Choose a Key & Mode</div>
                                <div className="text-sm text-mcb-secondary">Use the Controls section to select your musical key and mode (like C Ionian, D# Lydian, etc.)</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-mcb-secondary/30 hover:bg-mcb-secondary/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] text-white text-sm font-bold flex-shrink-0">
                                2
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Explore Chords</div>
                                <div className="text-sm text-mcb-secondary">Browse the Chord Explorer below to discover chords that fit your chosen key/mode</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-mcb-secondary/30 hover:bg-mcb-secondary/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] text-white text-sm font-bold flex-shrink-0">
                                3
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Build Sequences</div>
                                <div className="text-sm text-mcb-secondary">Click the + button on chords to add them to your sequence</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-mcb-secondary/30 hover:bg-mcb-secondary/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] text-white text-sm font-bold flex-shrink-0">
                                4
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Create Patterns</div>
                                <div className="text-sm text-mcb-secondary">Use the Sequencer to create rhythmic patterns for your chords</div>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4 p-3 rounded-lg bg-mcb-secondary/30 hover:bg-mcb-secondary/50 transition-colors">
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--mcb-accent-secondary)] text-white text-sm font-bold flex-shrink-0">
                                5
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold text-white mb-1">Play & Perform</div>
                                <div className="text-sm text-mcb-secondary">Hit Play to hear your creation, or use Live Mode for real-time performance</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Keyboard Shortcuts">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h5 className="text-white font-semibold text-sm border-b border-mcb-primary pb-2 text-left">Playback Control</h5>
                            <div className="flex items-center justify-between p-2 rounded-md bg-mcb-secondary/30">
                                <span className="text-sm text-left">Play/Pause sequencer</span>
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">Space</kbd>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-white font-semibold text-sm border-b border-mcb-primary pb-2 text-left">Navigation</h5>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 rounded-md bg-mcb-secondary/30">
                                    <span className="text-sm text-left">Expand chord buttons</span>
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">L</kbd>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-mcb-secondary/30">
                                    <span className="text-sm text-left">Select chord from sequence</span>
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">1-9</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Piano & Audio Controls">
                    <div className="space-y-6">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Piano Interaction</h5>
                            <p className="text-sm text-left">Click piano keys to play individual notes. The piano highlights scale notes and chord tones based on your current selection.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Audio Settings</h5>
                            <p className="text-sm mb-3 text-left">Access comprehensive audio controls through the Settings panel in the Controls section:</p>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Voice:</strong> <span className="text-mcb-secondary">Choose from multiple instrument sounds</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Volume & Octave:</strong> <span className="text-mcb-secondary">Adjust overall volume and pitch range</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Effects:</strong> <span className="text-mcb-secondary">Add reverb, chorus, and delay</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Equalizer:</strong> <span className="text-mcb-secondary">Shape the sound with bass, mid, and treble controls</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-left">
                                        <strong className="text-white">Note Duration:</strong> <span className="text-mcb-secondary">Control how long notes ring out</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Pattern Sequencer">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Understanding Patterns</h5>
                            <p className="text-sm mb-3 text-left">Patterns control which chord tones play at different time steps. Each step can be:</p>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">—</code>
                                    <span className="text-sm text-mcb-secondary text-left">Rest/silence (represented as 'x' in custom patterns)</span>
                                </div>
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">1, 2, 3...</code>
                                    <span className="text-sm text-mcb-secondary text-left">Play the 1st, 2nd, 3rd... note of the chord</span>
                                </div>
                                <div className="flex items-center space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <code className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-white min-w-[4rem] text-center">1↑, 2↑...</code>
                                    <span className="text-sm text-mcb-secondary text-left">Play the note one octave higher ('+' in custom patterns)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Pattern Controls</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Add/Remove Steps:</strong> Use the +/- buttons to change pattern length (1-16 steps)</div>
                                    <div><strong className="text-white">Pattern Presets:</strong> Choose from pre-built patterns organized by category and note count</div>
                                    <div><strong className="text-white">Custom Patterns:</strong> Enter your own pattern using notation like "1,x,3,2+" and click Apply</div>
                                    <div><strong className="text-white">Visual Feedback:</strong> Blue indicator shows the currently playing step</div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Timing Controls</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">BPM:</strong> Set tempo from 60-200 beats per minute</div>
                                    <div><strong className="text-white">Subdivision:</strong> Choose note duration (32nd, 16th, 8th, quarter, half notes)</div>
                                    <div><strong className="text-white">Swing:</strong> Add groove by delaying alternate notes (0-50%)</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Chord-Specific Patterns</h5>
                            <p className="text-sm mb-3 text-left">Each chord in your sequence can have its own unique pattern:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Global Pattern:</strong> The default pattern that plays when no chord is selected (shown with cyan "Global Pattern" label)</div>
                                <div><strong className="text-white">Chord Pattern:</strong> Select a chord from your sequence to edit its specific pattern (shown with purple chord name label)</div>
                                <div><strong className="text-white">Automatic Switching:</strong> The sequencer automatically uses each chord's pattern during playback</div>
                                <div><strong className="text-white">Visual Indicators:</strong> Pattern editor shows which chord you're currently editing</div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Pattern Presets</h5>
                            <p className="text-sm mb-3 text-left">Browse categorized pattern presets to quickly create common rhythmic patterns:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Filter by Note Count:</strong> Enable "Hide patterns with fewer notes" to show only patterns that use all available chord notes</div>
                                <div><strong className="text-white">Categories:</strong> Patterns are organized by style (Arpeggios, Rhythmic, Bass Lines, etc.)</div>
                                <div><strong className="text-white">Visual Preview:</strong> Each preset shows its pattern notation before applying</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="MIDI Recording & Export">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Automatic MIDI Recording</h5>
                            <p className="text-sm mb-3 text-left">The app automatically records your sequencer performances as standard MIDI files that you can export and use in any DAW or music software.</p>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Start Recording:</strong> <span className="text-mcb-secondary">Recording begins automatically when you press Play on the sequencer</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Recording Indicator:</strong> <span className="text-mcb-secondary">A red pulsing indicator appears showing "Recording MIDI" during playback</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Stop Recording:</strong> <span className="text-mcb-secondary">Recording stops when you press Stop or Pause on the sequencer</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Save MIDI:</strong> <span className="text-mcb-secondary">After stopping, a green "Save MIDI" button appears - click to download your recording</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">What Gets Recorded</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Note Events:</strong> All notes played by the sequencer with accurate timing</div>
                                    <div><strong className="text-white">Tempo:</strong> Your BPM setting is preserved in the MIDI file</div>
                                    <div><strong className="text-white">Duration:</strong> Note lengths based on your note duration setting</div>
                                    <div><strong className="text-white">Patterns:</strong> Records the full sequence including chord-specific patterns</div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Using MIDI Files</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Import to DAW:</strong> Drag the .mid file into any music production software</div>
                                    <div><strong className="text-white">Change Instruments:</strong> Assign any virtual instrument or sound</div>
                                    <div><strong className="text-white">Further Editing:</strong> Edit timing, velocities, and notes in your DAW</div>
                                    <div><strong className="text-white">Timestamped Files:</strong> Each export is automatically named with a timestamp</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Tips for MIDI Recording</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div>Set your desired BPM and timing before starting playback</div>
                                <div>Let the sequence play through completely for the best recording</div>
                                <div>Multiple recordings can be made - each creates a new file</div>
                                <div>The "Save MIDI" button remains available until you start a new recording</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Chord Explorer & Sequences">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Finding Chords</h5>
                            <p className="text-sm mb-3 text-left">The Chord Explorer shows all chords that fit your selected key and mode. You can:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Filter by root note</strong> to find specific chord types</div>
                                <div><strong className="text-white">Search</strong> for chord names or note combinations</div>
                                <div><strong className="text-white">Click to preview</strong> any chord</div>
                                <div><strong className="text-white">Click ↓</strong> to see the individual notes in a chord</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Building Sequences</h5>
                            <p className="text-sm mb-3 text-left">Add chords to your sequence using the <span className="text-green-400 font-bold">+</span> button. Your chord sequence appears at the bottom where you can:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div>Click any chord to play it immediately</div>
                                <div>Use numbers 1-9 to jump between chords</div>
                                <div>Toggle Delete mode to remove unwanted chords</div>
                                <div>Clear all chords to start fresh</div>
                                <div><strong className="text-[var(--mcb-accent-text-primary)]">Click the gear icon</strong> to enter Edit mode and modify chords</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Chord Editing">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Edit Mode</h5>
                            <p className="text-sm mb-3 text-left">Click the <span className="text-[var(--mcb-accent-text-primary)] font-bold">gear icon</span> next to your chord sequence to enter Edit Mode. In this mode, you can:</p>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Click any chord</strong> to open the chord editor</div>
                                <div><strong className="text-white">Modify chord voicings</strong> by reordering notes</div>
                                <div><strong className="text-white">Add slash chords</strong> to change the bass note</div>
                                <div><strong className="text-white">Preview changes</strong> before saving them</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Slash Chords</h5>
                                <p className="text-sm mb-3 text-left">Create slash chords (like C/E) by specifying a bass note:</p>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Bass Note Field:</strong> Enter a note name (e.g., E, Gb, C)</div>
                                    <div><strong className="text-white">Automatic Voicing:</strong> The bass note moves to the lowest position</div>
                                    <div><strong className="text-white">Chord Name:</strong> Updates to show the slash notation (C/E)</div>
                                    <div><strong className="text-white">Remove Bass:</strong> Clear the field to return to original chord</div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Note Reordering</h5>
                                <p className="text-sm mb-3 text-left">Change the order of chord notes for different voicings:</p>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Drag & Drop:</strong> Drag notes to reorder them</div>
                                    <div><strong className="text-white">Arrow Buttons:</strong> Use up/down arrows to move notes</div>
                                    <div><strong className="text-white">Auto-Detection:</strong> Slash note updates automatically when you change the bass</div>
                                    <div><strong className="text-white">Visual Feedback:</strong> Slash notes are highlighted in amber</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Editor Controls</h5>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Preview:</strong> Click the play button to hear your changes</div>
                                    <div><strong className="text-white">Save:</strong> Green checkmark to confirm edits</div>
                                    <div><strong className="text-white">Cancel:</strong> Discard changes and close editor</div>
                                </div>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Original Notes:</strong> Editor preserves original chord voicing</div>
                                    <div><strong className="text-white">Real-time Updates:</strong> Changes reflect immediately in the editor</div>
                                    <div><strong className="text-white">Full-screen:</strong> Editor takes over the entire interface for focused editing</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                <HelpSection title="Live Mode">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Performance Mode</h5>
                            <p className="text-sm mb-3 text-left">Live Mode expands your chord sequence into a full-screen performance interface perfect for:</p>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Live performance:</strong> <span className="text-mcb-secondary">Large, touch-friendly chord buttons</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Practice sessions:</strong> <span className="text-mcb-secondary">Easy chord switching with visual feedback</span>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2 rounded-md bg-mcb-primary">
                                    <div className="w-2 h-2 rounded-full bg-[var(--mcb-accent-text-primary)] mt-2 flex-shrink-0"></div>
                                    <div className="text-sm text-left">
                                        <strong className="text-white">Composition:</strong> <span className="text-mcb-secondary">Hear chord progressions in real-time</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
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
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
                                <h5 className="text-white font-semibold mb-3 text-sm text-left">Navigation</h5>
                                <div className="space-y-2 text-sm text-left">
                                    <div><strong className="text-white">Sequencer Header:</strong> Click to show/hide the pattern editor</div>
                                    <div><strong className="text-white">Settings Panels:</strong> Most sections have expandable settings</div>
                                    <div><strong className="text-white">Status Indicators:</strong> Top bar shows current key, mode, and playback status</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-mcb-secondary/30">
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
                    <div className="p-4 rounded-lg bg-mcb-secondary/30 mt-4">
                        <h5 className="text-white font-semibold mb-3 text-sm text-left">Responsive Design</h5>
                        <p className="text-sm text-left">The interface adapts to different screen sizes. On mobile devices, some controls are simplified and touch-optimized for better usability.</p>
                    </div>
                </HelpSection>

                <HelpSection title="Troubleshooting">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Audio Issues</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">No sound:</strong> Check device volume and ensure audio isn't muted</div>
                                <div><strong className="text-white">iOS devices:</strong> Tap any button first to initialize audio</div>
                                <div><strong className="text-white">Distorted audio:</strong> Lower the volume setting in piano controls</div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-mcb-secondary/30">
                            <h5 className="text-white font-semibold mb-3 text-sm text-left">Performance</h5>
                            <div className="space-y-2 text-sm text-left">
                                <div><strong className="text-white">Lag or glitches:</strong> Close other browser tabs using audio</div>
                                <div><strong className="text-white">Mobile performance:</strong> Use lower reverb/effect settings for better performance</div>
                            </div>
                        </div>
                    </div>
                </HelpSection>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-mcb-primary/50">
                    <p className="text-xs text-mcb-tertiary text-left">
                        Need more help? Check the GitHub repository for detailed documentation and examples.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default HelpModal;