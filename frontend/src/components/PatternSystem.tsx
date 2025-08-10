import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { PlayCircleIcon, PauseIcon, ArrowPathIcon, Cog6ToothIcon } from '@heroicons/react/20/solid';
import { PATTERN_PRESETS, SUBDIVISIONS } from '../util/Pattern';

interface ChordPattern {
  pattern: string[];
  enabled: boolean;
}

interface PatternSystemProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  addedChords: { name: string; notes: string }[];
  activeChordIndex: number | null;
  getCurrentPattern: () => string[];
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

// Memoized Step Editor to prevent re-renders from closing dropdowns
const StepEditor = memo(({ 
  stepIndex, 
  stepValue, 
  maxNotes, 
  onStepChange
}: { 
  stepIndex: number;
  stepValue: string;
  maxNotes: number;
  onStepChange: (index: number, value: string) => void;
}) => {
  return (
    <div className="relative">
      <select
        value={stepValue}
        onChange={(e) => {
          e.stopPropagation();
          onStepChange(stepIndex, e.target.value);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        className={`w-full h-8 text-xs bg-[#2a2f3a] border rounded text-center appearance-none cursor-pointer ${
          stepValue === 'x' 
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
    </div>
  );
});

StepEditor.displayName = 'StepEditor';

const PatternSystem: React.FC<PatternSystemProps> = ({
  activeNotes,
  normalizedScaleNotes,
  addedChords,
  activeChordIndex,
  getCurrentPattern,
  onPatternChange,
  globalPatternState
}) => {
  // ========== LOCAL STATE ==========
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPattern, setCustomPattern] = useState<string>('1,2,3,4');
  const [lastUsedPattern, setLastUsedPattern] = useState<string[]>(['1', '2', '3', '4']);

  // ========== PATTERN MANAGEMENT ==========
  
  // Get the current pattern for the active chord
  const currentPattern = useMemo(() => {
    if (activeChordIndex !== null && globalPatternState.chordPatterns[activeChordIndex]) {
      return globalPatternState.chordPatterns[activeChordIndex].pattern;
    }
    // Return last used pattern as default
    return lastUsedPattern;
  }, [activeChordIndex, globalPatternState.chordPatterns, lastUsedPattern]);

  // Initialize pattern for new chord when it becomes active
  useEffect(() => {
    if (activeChordIndex !== null && !globalPatternState.chordPatterns[activeChordIndex]) {
      // Initialize with last used pattern
      const newChordPatterns = { ...globalPatternState.chordPatterns };
      newChordPatterns[activeChordIndex] = { pattern: [...lastUsedPattern], enabled: true };
      onPatternChange?.({ chordPatterns: newChordPatterns });
    }
  }, [activeChordIndex, globalPatternState.chordPatterns, lastUsedPattern, onPatternChange]);

  // Update custom pattern input when current pattern changes
  useEffect(() => {
    if (currentPattern) {
      setCustomPattern(currentPattern.join(','));
    }
  }, [currentPattern]);

  // ========== CONTROL FUNCTIONS ==========
  
  const togglePlayback = useCallback(() => {
    const newIsPlaying = !globalPatternState.isPlaying;
    onPatternChange?.({ 
      isPlaying: newIsPlaying
    });
  }, [globalPatternState.isPlaying, onPatternChange]);

  const resetPattern = useCallback(() => {
    onPatternChange?.({ 
      isPlaying: false,
      currentStep: 0
    });
  }, [onPatternChange]);

  const updateCurrentPattern = useCallback((newPattern: string[]) => {
    setLastUsedPattern(newPattern);
    
    if (activeChordIndex !== null) {
      const newChordPatterns = { ...globalPatternState.chordPatterns };
      newChordPatterns[activeChordIndex] = { 
        pattern: newPattern, 
        enabled: true 
      };
      onPatternChange?.({ chordPatterns: newChordPatterns });
    }
  }, [activeChordIndex, globalPatternState.chordPatterns, onPatternChange]);

  const handleStepChange = useCallback((stepIndex: number, value: string) => {
    const newPattern = [...currentPattern];
    newPattern[stepIndex] = value;
    updateCurrentPattern(newPattern);
  }, [currentPattern, updateCurrentPattern]);

  const addStep = useCallback(() => {
    if (currentPattern.length < 16) {
      const newPattern = [...currentPattern, 'x'];
      updateCurrentPattern(newPattern);
    }
  }, [currentPattern, updateCurrentPattern]);

  const removeStep = useCallback(() => {
    if (currentPattern.length > 1) {
      const newPattern = currentPattern.slice(0, -1);
      updateCurrentPattern(newPattern);
    }
  }, [currentPattern, updateCurrentPattern]);

  const applyCustomPattern = useCallback(() => {
    try {
      const pattern = customPattern.split(',').map(s => s.trim()).filter(s => s);
      if (pattern.length > 0) {
        updateCurrentPattern(pattern);
      }
    } catch (error) {
      console.error('Invalid pattern format');
    }
  }, [customPattern, updateCurrentPattern]);

  const applyPreset = useCallback((preset: typeof PATTERN_PRESETS[0]) => {
    updateCurrentPattern(preset.pattern);
  }, [updateCurrentPattern]);

  // Calculate which step is currently playing
  const currentStepIndex = useMemo(() => {
    if (!globalPatternState.isPlaying) return -1;
    return globalPatternState.currentStep % currentPattern.length;
  }, [globalPatternState.isPlaying, globalPatternState.currentStep, currentPattern.length]);

  // ========== RENDER ==========

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-[#3d434f] rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-white">Pattern Sequencer</h2>
          <div className="text-xs text-gray-400">
            {activeChordIndex !== null ? (
              <>Playing: {addedChords[activeChordIndex]?.name} | Pattern: {currentPattern.join('-')}</>
            ) : (
              <>No chord selected | Default: {currentPattern.join('-')}</>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-lg transition-colors ${
              showAdvanced 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-[#4a5262] hover:bg-[#5a6272] text-white'
            }`}
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
            title="Reset pattern"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Pattern Display */}
      <div className="mb-4 p-4 bg-[#2a2f3a] rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            {activeChordIndex !== null 
              ? `Chord ${activeChordIndex + 1}: "${addedChords[activeChordIndex]?.name}"`
              : 'Select a chord to edit its pattern'
            }
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-400">Steps: {currentPattern.length}</div>
            <button 
              onClick={removeStep} 
              disabled={currentPattern.length <= 1}
              className="w-6 h-6 bg-[#4a5262] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-colors"
            >-</button>
            <button 
              onClick={addStep} 
              disabled={currentPattern.length >= 16}
              className="w-6 h-6 bg-[#4a5262] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded transition-colors"
            >+</button>
          </div>
        </div>
        
        {/* Step Grid */}
        <div className="grid grid-cols-8 gap-1">
          {currentPattern.map((step, index) => (
            <StepEditor
              key={`${activeChordIndex}-${index}`}
              stepIndex={index}
              stepValue={step}
              maxNotes={Math.max(4, activeNotes.length)}
              onStepChange={handleStepChange}
            />
          ))}
        </div>

        {/* Step Indicator - More prominent */}
        <div className="grid grid-cols-8 gap-1 mt-2">
          {currentPattern.map((_, index) => (
            <div key={index} className="flex justify-center">
              <div className={`transition-all ${
                currentStepIndex === index 
                  ? 'w-full h-1 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50' 
                  : 'w-full h-1 bg-gray-600 rounded-full'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Playback Status */}
      {globalPatternState.isPlaying && (
        <div className="mb-4 px-4 py-2 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
          <div className="text-xs text-green-300 flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              <span className="font-medium">Playing</span>
            </div>
            <span>Step {currentStepIndex + 1}/{currentPattern.length}</span>
            <span>{globalPatternState.bpm} BPM</span>
            {activeChordIndex !== null && (
              <span className="text-green-200">{addedChords[activeChordIndex]?.name}</span>
            )}
          </div>
        </div>
      )}

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timing Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Timing</h3>
            
            <div>
              <label className="block text-xs text-gray-400 mb-2">BPM: {globalPatternState.bpm}</label>
              <input
                type="range"
                min="60"
                max="200"
                value={globalPatternState.bpm}
                onChange={(e) => onPatternChange?.({ bpm: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>60</span>
                <span>200</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Subdivision</label>
              <select
                value={globalPatternState.subdivision}
                onChange={(e) => onPatternChange?.({ subdivision: parseFloat(e.target.value) })}
                className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-xs focus:border-blue-500 transition-colors"
              >
                {SUBDIVISIONS.map(sub => (
                  <option key={sub.value} value={sub.value}>
                    {sub.symbol} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Swing: {globalPatternState.swing}%</label>
              <input
                type="range"
                min="0"
                max="50"
                value={globalPatternState.swing}
                onChange={(e) => onPatternChange?.({ swing: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Pattern Presets */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Presets</h3>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {PATTERN_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset)}
                  className="p-3 rounded text-xs font-medium transition-colors text-left bg-[#2a2f3a] text-gray-300 hover:bg-[#343a47] hover:text-white border border-transparent hover:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{preset.name}</span>
                    <span>{preset.icon}</span>
                  </div>
                  <div className="text-xs opacity-75 font-mono text-gray-400">
                    {preset.pattern.join('-')}
                  </div>
                  <div className="text-xs opacity-60 text-gray-500 mt-1">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Pattern Input */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Custom</h3>
            
            <div>
              <label className="block text-xs text-gray-400 mb-2">Pattern (comma-separated)</label>
              <input
                type="text"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyCustomPattern()}
                placeholder="1,x,3,2+"
                className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-xs focus:border-blue-500 transition-colors"
              />
              <button
                onClick={applyCustomPattern}
                className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
              >
                Apply Pattern
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1 p-2 bg-[#2a2f3a] rounded">
              <div className="font-medium text-gray-400 mb-2">Notation:</div>
              <div><strong>x</strong> = rest (silence)</div>
              <div><strong>1+</strong> = octave up</div>
              <div><strong>1-8</strong> = note index</div>
              <div className="text-gray-600 mt-2">Example: 1,x,3,2+ plays note 1, rest, note 3, note 2 up an octave</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternSystem;