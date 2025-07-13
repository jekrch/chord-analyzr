import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MidiNumbers } from 'react-piano';
import { PlayCircleIcon, PauseIcon, ArrowPathIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/20/solid';

// Pattern presets with rests
const PATTERN_PRESETS = [
  { name: 'Ascending', pattern: ['1', '2', '3', '4'], icon: '↗️', desc: 'Simple up' },
  { name: 'Descending', pattern: ['4', '3', '2', '1'], icon: '↘️', desc: 'Simple down' },
  { name: 'Up-Down', pattern: ['1', '2', '3', '4', '3', '2'], icon: '↗️↘️', desc: 'Peak wave' },
  { name: 'Alberti Bass', pattern: ['1', '3', '2', '3'], icon: '🎼', desc: 'Classical' },
  { name: 'Broken Chord', pattern: ['1', '3', '5', '3'], icon: '🎵', desc: 'Arpeggiated' },
  { name: 'Syncopated', pattern: ['1', 'x', '3', 'x', '2', '4'], icon: '⚡', desc: 'Off-beat' },
  { name: 'Minimal', pattern: ['1', 'x', 'x', '3', 'x', 'x'], icon: '◾', desc: 'Sparse' },
  { name: 'Bass Heavy', pattern: ['1', '1', 'x', '2', '1', 'x'], icon: '🔊', desc: 'Low focus' },
  { name: 'Octaves', pattern: ['1', '1+', '3', '3+'], icon: '🎹', desc: 'High/low' },
  { name: 'Polyrhythm', pattern: ['1', '3', 'x', '2', '4', 'x', '1', 'x'], icon: '🌀', desc: 'Complex' }
];

const SUBDIVISIONS = [
  { name: 'Whole', value: 4, symbol: '𝅝' },
  { name: 'Half', value: 2, symbol: '𝅗𝅥' },
  { name: 'Quarter', value: 1, symbol: '♩' },
  { name: 'Eighth', value: 0.5, symbol: '♫' },
  { name: 'Sixteenth', value: 0.25, symbol: '𝅘𝅥𝅯' },
  { name: 'Triplet', value: 0.333, symbol: '♪3' }
];

interface ChordPattern {
  pattern: string[];
  enabled: boolean;
}

interface PatternSystemProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  addedChords: { name: string; notes: string }[];
  activeChordIndex: number | null;
  onPatternChange?: (newPatternState: Partial<{
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  }>) => void;
  globalPatternState: {
    defaultPattern: string[];
    chordPatterns: { [chordIndex: number]: ChordPattern };
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
    globalClockStartTime: number;
  };
}

const PatternSystem: React.FC<PatternSystemProps> = ({
  activeNotes,
  normalizedScaleNotes,
  addedChords,
  activeChordIndex,
  onPatternChange,
  globalPatternState
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingChord, setEditingChord] = useState<number | null>(null);
  const [customPattern, setCustomPattern] = useState<string>('1,2,3,4');

  // Sequencer timing - this runs even when component is collapsed
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const globalClockRef = React.useRef<number>(0);

  // Calculate timing
  const stepDuration = useMemo(() => {
    const quarterNoteDuration = 60000 / globalPatternState.bpm;
    return quarterNoteDuration * globalPatternState.subdivision;
  }, [globalPatternState.bpm, globalPatternState.subdivision]);

  const getSwingDuration = useCallback((stepIndex: number) => {
    if (globalPatternState.swing === 0) return stepDuration;
    const isOffBeat = stepIndex % 2 === 1;
    const swingRatio = 1 + (globalPatternState.swing / 100);
    return isOffBeat ? stepDuration * swingRatio : stepDuration / swingRatio;
  }, [stepDuration, globalPatternState.swing]);

  // Global sequencer clock - this runs independently and keeps the sequencer working when collapsed
  useEffect(() => {
    if (globalPatternState.isPlaying) {
      if (!intervalRef.current) {
        // Initialize global clock
        globalClockRef.current = 0;
        onPatternChange?.({ globalClockStartTime: Date.now() });
        
        const tick = () => {
          // Update current step
          onPatternChange?.({ currentStep: globalClockRef.current });
          
          // Advance global clock
          globalClockRef.current++;
          const nextStepDuration = getSwingDuration(globalClockRef.current);
          intervalRef.current = setTimeout(tick, nextStepDuration);
        };

        // Start the clock immediately
        tick();
      }
    } else {
      // Stop the clock
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      globalClockRef.current = 0;
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [globalPatternState.isPlaying, globalPatternState.bpm, globalPatternState.subdivision, 
      globalPatternState.swing, getSwingDuration, onPatternChange]);

  // Get the current active pattern - this determines what's displayed
  const currentPattern = useMemo(() => {
    if (editingChord !== null) {
      // If editing a specific chord, show that chord's pattern
      return globalPatternState.chordPatterns[editingChord]?.pattern || globalPatternState.defaultPattern;
    } else if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
      // If there's an active chord with custom pattern, show that
      return globalPatternState.chordPatterns[activeChordIndex].pattern;
    } else {
      // Otherwise show default pattern
      return globalPatternState.defaultPattern;
    }
  }, [editingChord, activeChordIndex, globalPatternState.chordPatterns, globalPatternState.defaultPattern]);

  // Update custom pattern input when current pattern changes
  useEffect(() => {
    setCustomPattern(currentPattern.join(','));
  }, [currentPattern]);

  // Control functions
  const togglePlayback = () => {
    if (globalPatternState.isPlaying) {
      // Stop completely
      onPatternChange?.({ isPlaying: false });
    } else {
      // Start playback
      onPatternChange?.({ 
        isPlaying: true,
        globalClockStartTime: Date.now()
      });
    }
  };

  const resetPattern = () => {
    onPatternChange?.({ 
      isPlaying: false,
      currentStep: 0
    });
  };

  const setDefaultPattern = (pattern: string[]) => {
    onPatternChange?.({ defaultPattern: pattern });
    setCustomPattern(pattern.join(','));
  };

  const setChordPattern = (chordIndex: number, pattern: string[], enabled: boolean = true) => {
    const newChordPatterns = { ...globalPatternState.chordPatterns };
    newChordPatterns[chordIndex] = { pattern, enabled };
    onPatternChange?.({ chordPatterns: newChordPatterns });
  };

  const toggleChordPattern = (chordIndex: number) => {
    const newChordPatterns = { ...globalPatternState.chordPatterns };
    if (newChordPatterns[chordIndex]) {
      newChordPatterns[chordIndex].enabled = !newChordPatterns[chordIndex].enabled;
    } else {
      newChordPatterns[chordIndex] = { pattern: [...globalPatternState.defaultPattern], enabled: true };
    }
    onPatternChange?.({ chordPatterns: newChordPatterns });
    
    // If we just enabled a pattern for this chord, start editing it
    if (newChordPatterns[chordIndex].enabled) {
      setEditingChord(chordIndex);
    }
  };

  const applyCustomPattern = () => {
    try {
      const pattern = customPattern.split(',').map(s => s.trim()).filter(s => s);
      if (pattern.length > 0) {
        if (editingChord !== null) {
          setChordPattern(editingChord, pattern);
        } else if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
          // If viewing a chord's custom pattern, apply to that chord
          setChordPattern(activeChordIndex, pattern);
        } else {
          setDefaultPattern(pattern);
        }
      }
    } catch (error) {
      console.error('Invalid pattern format');
    }
  };

  // Visual step sequencer with persistent dropdowns
  const StepSequencer: React.FC<{ 
    pattern: string[], 
    onPatternChange: (pattern: string[]) => void,
    maxNotes: number 
  }> = ({ pattern, onPatternChange: onChange, maxNotes }) => {
    const [steps, setSteps] = useState(pattern.length);

    const updateStep = (stepIndex: number, value: string) => {
      const newPattern = [...pattern];
      newPattern[stepIndex] = value;
      onChange(newPattern);
    };

    const addStep = () => {
      if (steps < 16) {
        const newPattern = [...pattern, 'x'];
        setSteps(steps + 1);
        onChange(newPattern);
      }
    };

    const removeStep = () => {
      if (steps > 1) {
        const newPattern = pattern.slice(0, -1);
        setSteps(steps - 1);
        onChange(newPattern);
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Steps: {steps}</div>
          <div className="flex space-x-1">
            <button 
              onClick={removeStep} 
              disabled={steps <= 1}
              className="w-6 h-6 bg-[#4a5262] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded"
            >-</button>
            <button 
              onClick={addStep} 
              disabled={steps >= 16}
              className="w-6 h-6 bg-[#4a5262] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded"
            >+</button>
          </div>
        </div>
        
        <div className="grid grid-cols-8 gap-1">
          {pattern.map((step, index) => {
            const isCurrentStep = globalPatternState.isPlaying && 
              (globalPatternState.currentStep % pattern.length) === index;
            
            return (
              <div key={index} className="relative">
                <select
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent blur on click
                  onFocus={(e) => e.stopPropagation()} // Prevent blur
                  className={`w-full h-8 text-xs bg-[#2a2f3a] border rounded text-center appearance-none cursor-pointer transition-all ${
                    isCurrentStep
                      ? 'border-blue-500 bg-blue-900 text-blue-200 shadow-lg scale-105'
                      : step === 'x' 
                        ? 'border-gray-700 text-gray-500'
                        : 'border-gray-600 text-white hover:border-gray-500'
                  }`}
                >
                  <option value="x">—</option>
                  {Array.from({ length: Math.min(maxNotes, 8) }, (_, i) => (
                    <React.Fragment key={i + 1}>
                      <option value={String(i + 1)}>{i + 1}</option>
                      <option value={`${i + 1}+`}>{i + 1}↑</option>
                    </React.Fragment>
                  ))}
                </select>
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full transition-all ${
                  isCurrentStep ? 'bg-blue-400 opacity-100' : 'bg-blue-400 opacity-30'
                }`}></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-[#3d434f] rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-white">Pattern Sequencer</h2>
          <div className="text-xs text-gray-400">
            {currentPattern.join('-')} | {activeNotes.length} notes
            {activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled && 
              <span className="ml-2 text-purple-300">• Using {addedChords[activeChordIndex]?.name} pattern</span>
            }
            {activeChordIndex !== null && !globalPatternState.chordPatterns[activeChordIndex]?.enabled &&
              <span className="ml-2 text-cyan-300">• Playing {addedChords[activeChordIndex]?.name} (default pattern)</span>
            }
            {activeChordIndex === null &&
              <span className="ml-2 text-gray-400">• Default pattern</span>
            }
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 bg-[#4a5262] hover:bg-[#5a6272] text-white rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlayback}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              globalPatternState.isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {globalPatternState.isPlaying ? (
              <><PauseIcon className="w-4 h-4 mr-2" />Stop</>
            ) : (
              <><PlayCircleIcon className="w-4 h-4 mr-2" />Play</> 
            )}
          </button>
          <button
            onClick={resetPattern}
            className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Pattern Display */}
      <div className="mb-4 p-3 bg-[#2a2f3a] rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            {editingChord !== null 
              ? `Editing Chord ${editingChord + 1} Pattern: "${addedChords[editingChord]?.name}"`
              : activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled
                ? `Chord ${activeChordIndex + 1} Custom Pattern: "${addedChords[activeChordIndex]?.name}"`
                : activeChordIndex !== null
                  ? `Chord ${activeChordIndex + 1} (Default Pattern): "${addedChords[activeChordIndex]?.name}"`
                  : 'Default Pattern'
            }
          </div>
          {editingChord !== null && (
            <button
              onClick={() => setEditingChord(null)}
              className="text-xs text-gray-400 hover:text-white flex items-center"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Exit Edit
            </button>
          )}
          {editingChord === null && activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled && (
            <button
              onClick={() => setEditingChord(activeChordIndex)}
              className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center"
            >
              ✎ Edit Pattern
            </button>
          )}
          {editingChord === null && activeChordIndex !== null && !globalPatternState.chordPatterns[activeChordIndex]?.enabled && (
            <button
              onClick={() => {
                toggleChordPattern(activeChordIndex);
                setEditingChord(activeChordIndex);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
            >
              + Create Custom Pattern
            </button>
          )}
        </div>
        
        <StepSequencer 
          pattern={currentPattern}
          onPatternChange={(pattern) => {
            if (editingChord !== null) {
              setChordPattern(editingChord, pattern);
            } else if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
              // If we're viewing a chord's custom pattern, edit that chord's pattern
              setChordPattern(activeChordIndex, pattern);
            } else {
              setDefaultPattern(pattern);
            }
          }}
          maxNotes={activeNotes.length}
        />
      </div>

      {/* Chord Patterns */}
      {addedChords.length > 0 && (
        <div className="mb-4 p-3 bg-[#2a2f3a] rounded-lg">
          <div className="text-xs text-gray-300 uppercase tracking-wide mb-3">
            Chord Overrides 
            <span className="text-gray-500 ml-2 normal-case">(Click to enable/disable, yellow dot = has custom pattern)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {addedChords.map((chord, index) => {
              const hasPattern = globalPatternState.chordPatterns[index]?.enabled;
              const isEditing = editingChord === index;
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => toggleChordPattern(index)}
                    className={`w-full p-2 rounded text-xs font-medium transition-all ${
                      hasPattern
                        ? isEditing
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-[#4a5262] hover:bg-[#5a6272] text-gray-300'
                    }`}
                  >
                    {chord.name}
                  </button>
                  {hasPattern && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChord(isEditing ? null : index);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-full text-xs flex items-center justify-center"
                      title="Edit pattern"
                    >
                      ✎
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timing */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Timing</h3>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">BPM: {globalPatternState.bpm}</label>
              <input
                type="range"
                min="60"
                max="200"
                value={globalPatternState.bpm}
                onChange={(e) => onPatternChange?.({ bpm: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Subdivision</label>
              <select
                value={globalPatternState.subdivision}
                onChange={(e) => onPatternChange?.({ subdivision: parseFloat(e.target.value) })}
                className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-xs"
              >
                {SUBDIVISIONS.map(sub => (
                  <option key={sub.value} value={sub.value}>
                    {sub.symbol} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Swing: {globalPatternState.swing}%</label>
              <input
                type="range"
                min="0"
                max="50"
                value={globalPatternState.swing}
                onChange={(e) => onPatternChange?.({ swing: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Pattern Presets */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Presets</h3>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
              {PATTERN_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (editingChord !== null) {
                      setChordPattern(editingChord, preset.pattern);
                    } else if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled) {
                      // If viewing a chord's custom pattern, apply to that chord
                      setChordPattern(activeChordIndex, preset.pattern);
                    } else {
                      setDefaultPattern(preset.pattern);
                    }
                  }}
                  className="p-2 rounded text-xs font-medium transition-colors text-left bg-[#2a2f3a] text-gray-300 hover:bg-[#343a47] hover:text-white"
                >
                  <div className="flex items-center justify-between">
                    <span>{preset.name}</span>
                    <span>{preset.icon}</span>
                  </div>
                  <div className="text-xs opacity-75 font-mono">
                    {preset.pattern.join('-')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Custom</h3>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pattern (comma-separated)</label>
              <input
                type="text"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyCustomPattern()}
                placeholder="1,x,3,2+"
                className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-xs"
              />
              <button
                onClick={applyCustomPattern}
                className="mt-1 w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
              >
                Apply {editingChord !== null 
                  ? `to ${addedChords[editingChord]?.name}` 
                  : activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]?.enabled
                    ? `to ${addedChords[activeChordIndex]?.name}`
                    : 'to Default'
                }
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div><strong>x</strong> = rest</div>
              <div><strong>1+</strong> = octave up</div>
              <div><strong>1-8</strong> = note index</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternSystem;