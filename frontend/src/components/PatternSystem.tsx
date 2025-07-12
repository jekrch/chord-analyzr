import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MidiNumbers } from 'react-piano';
import { PlayCircleIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

// Pattern presets
const PATTERN_PRESETS = [
  { name: 'Ascending', pattern: [1, 2, 3, 4], icon: '↗️' },
  { name: 'Descending', pattern: [4, 3, 2, 1], icon: '↘️' },
  { name: 'Up-Down', pattern: [1, 2, 3, 4, 3, 2], icon: '↗️↘️' },
  { name: 'Down-Up', pattern: [4, 3, 2, 1, 2, 3], icon: '↘️↗️' },
  { name: 'Alberti Bass', pattern: [1, 3, 2, 3], icon: '🎼' },
  { name: 'Broken Chord', pattern: [1, 3, 5, 3], icon: '🎵' },
  { name: 'Rolling', pattern: [1, 2, 3, 4, 1, 2, 3, 4], icon: '🌊' },
  { name: 'Octaves', pattern: [1, 1, 3, 3], icon: '🎹' },
  { name: 'Skip Pattern', pattern: [1, 3, 2, 4], icon: '⚡' },
  { name: 'Complex', pattern: [1, 4, 2, 3, 4, 1], icon: '🌟' }
];

// Note subdivision options
const SUBDIVISIONS = [
  { name: 'Whole', value: 4, symbol: '𝅝' },
  { name: 'Half', value: 2, symbol: '𝅗𝅥' },
  { name: 'Quarter', value: 1, symbol: '♩' },
  { name: 'Eighth', value: 0.5, symbol: '♫' },
  { name: 'Sixteenth', value: 0.25, symbol: '𝅘𝅥𝅯' },
  { name: 'Triplet', value: 0.333, symbol: '♪3' }
];

interface PatternSystemProps {
  activeNotes: { note: string; octave?: number }[];
  normalizedScaleNotes: string[];
  onPatternChange?: (newPatternState: Partial<{
    pattern: number[];
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
  }>) => void;
  globalPatternState: {
    pattern: number[];
    bpm: number;
    subdivision: number;
    isPlaying: boolean;
    currentStep: number;
    swing: number;
    repeat: boolean;
    lastChordChangeTime: number;
  };
}

const PatternSystem: React.FC<PatternSystemProps> = ({
  activeNotes,
  normalizedScaleNotes,
  onPatternChange,
  globalPatternState
}) => {
  // Use globalPatternState instead of local state
  const patternState = globalPatternState;

  const [customPattern, setCustomPattern] = useState<string>('1,2,3,4');
  const [activePreviewNote, setActivePreviewNote] = useState<number | null>(null);

  // Simple, reliable pattern clock that doesn't reset on chord changes
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const patternStartTimeRef = useRef<number | null>(null);

  // Calculate timing based on BPM and subdivision with swing
  const stepDuration = useMemo(() => {
    const quarterNoteDuration = 60000 / patternState.bpm; // ms per quarter note
    const baseDuration = quarterNoteDuration * patternState.subdivision;
    return baseDuration;
  }, [patternState.bpm, patternState.subdivision]);

  // Apply swing to step duration
  const getSwingDuration = useCallback((stepIndex: number) => {
    if (patternState.swing === 0) return stepDuration;
    
    const isOffBeat = stepIndex % 2 === 1;
    const swingRatio = 1 + (patternState.swing / 100);
    
    return isOffBeat ? stepDuration * swingRatio : stepDuration / swingRatio;
  }, [stepDuration, patternState.swing]);

  // Simple pattern playback with steady timing
  useEffect(() => {
    if (patternState.isPlaying && activeNotes.length > 0 && patternState.pattern.length > 0) {
      // Only start new interval if one isn't already running
      if (!intervalRef.current) {
        patternStartTimeRef.current = Date.now();
        let currentStepIndex = 0;
        
        const playStep = () => {
          // Update step counter
          onPatternChange?.({ currentStep: currentStepIndex });
          
          // Play the note for this step
          const currentPatternIndex = currentStepIndex % patternState.pattern.length;
          const noteIndex = patternState.pattern[currentPatternIndex] - 1;
          
          if (noteIndex >= 0 && noteIndex < activeNotes.length) {
            const { note, octave = 4 } = activeNotes[noteIndex];
            const midiNote = MidiNumbers.fromNote(`${note}${octave}`);
            setActivePreviewNote(midiNote);
            
            // Clear preview note after 60% of step duration
            const currentStepDuration = getSwingDuration(currentStepIndex);
            setTimeout(() => setActivePreviewNote(null), currentStepDuration * 0.6);
          }

          // Schedule next step with swing timing
          currentStepIndex++;
          const nextStepDuration = getSwingDuration(currentStepIndex);
          intervalRef.current = setTimeout(playStep, nextStepDuration);
        };

        // Play first step immediately
        playStep();
      }
    } else {
      // Stop the pattern
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      patternStartTimeRef.current = null;
      setActivePreviewNote(null);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [patternState.isPlaying, patternState.bpm, patternState.subdivision, patternState.swing, patternState.pattern.length, getSwingDuration, onPatternChange]);

  // Handle pattern changes without disrupting timing
  useEffect(() => {
    // When activeNotes change but pattern is playing, don't restart the timer
    // The existing interval will continue and pick up the new notes
  }, [activeNotes]);

  // Pattern control functions
  const togglePlayback = () => {
    if (patternState.isPlaying) {
      // Stop playback
      onPatternChange?.({ isPlaying: false });
    } else {
      // Start playback - reset step counter but not timing
      onPatternChange?.({ 
        isPlaying: true, 
        currentStep: 0,
        lastChordChangeTime: Date.now()
      });
    }
  };

  const resetPattern = () => {
    // Stop playback and reset step
    onPatternChange?.({ currentStep: 0, isPlaying: false });
    setActivePreviewNote(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    patternStartTimeRef.current = null;
  };

  const setPresetPattern = (pattern: number[]) => {
    onPatternChange?.({ pattern, currentStep: 0 });
    setCustomPattern(pattern.join(','));
    // If playing, the existing interval will continue with the new pattern
  };

  const applyCustomPattern = () => {
    try {
      const pattern = customPattern.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);
      if (pattern.length > 0) {
        onPatternChange?.({ pattern, currentStep: 0 });
        // If playing, the existing interval will continue with the new pattern
      }
    } catch (error) {
      console.error('Invalid pattern format');
    }
  };

  // Simple piano key visualization component (no audio, just visual)
  const SimplePianoKey: React.FC<{ midiNumber: number; isActive: boolean; isBlack: boolean; note: string }> = ({ 
    midiNumber, isActive, isBlack, note 
  }) => (
    <div
      className={`relative ${
        isBlack 
          ? 'w-6 h-16 bg-gray-800 border border-gray-700 -mx-1.5 z-10' 
          : 'w-8 h-24 bg-white border border-gray-300'
      } ${
        isActive 
          ? isBlack 
            ? 'bg-blue-600' 
            : 'bg-blue-200' 
          : ''
      } transition-colors duration-100 flex items-end justify-center pb-1`}
    >
      {normalizedScaleNotes.includes(note.replace('#', '♯').replace('b', '♭')) && (
        <div className={`w-1 h-1 rounded-full ${isBlack ? 'bg-blue-200' : 'bg-blue-500'} mb-1`} />
      )}
    </div>
  );

  // Generate piano keys for preview
  const generatePianoKeys = () => {
    const keys = [];
    for (let midiNumber = 60; midiNumber <= 84; midiNumber++) { // C4 to C6
      const noteAttributes = MidiNumbers.getAttributes(midiNumber);
      const noteNameWithoutOctave = noteAttributes.note.slice(0, -1);
      const isBlack = noteAttributes.isAccidental;
      const isActive = activePreviewNote === midiNumber;
      
      keys.push(
        <SimplePianoKey
          key={midiNumber}
          midiNumber={midiNumber}
          isActive={isActive}
          isBlack={isBlack}
          note={noteNameWithoutOctave}
        />
      );
    }
    return keys;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-[#3d434f] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Pattern System</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlayback}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              patternState.isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {patternState.isPlaying ? (
              <><PauseIcon className="w-4 h-4 mr-2" />Pause</>
            ) : (
              <><PlayCircleIcon className="w-4 h-4 mr-2" />Play</>
            )}
          </button>
          <button
            onClick={resetPattern}
            className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pattern Visualization */}
      <div className="mb-6 p-4 bg-[#2a2f3a] rounded-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Current Pattern</h3>
        <div className="flex items-center space-x-2 overflow-x-auto">
          {patternState.pattern.map((step, index) => (
            <div
              key={index}
              className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold transition-all text-sm ${
                patternState.isPlaying && (patternState.currentStep % patternState.pattern.length) === index
                  ? 'bg-blue-500 text-white scale-110 shadow-lg'
                  : 'bg-[#4a5262] text-gray-300 hover:bg-[#5a6272]'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Controls Grid - Made more consistent with app styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Tempo Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Tempo & Timing</h3>
          
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
              BPM: {patternState.bpm}
            </label>
            <input
              type="range"
              min="60"
              max="200"
              value={patternState.bpm}
              onChange={(e) => onPatternChange?.({ bpm: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Note Subdivision</label>
            <select
              value={patternState.subdivision}
              onChange={(e) => onPatternChange?.({ subdivision: parseFloat(e.target.value) })}
              className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SUBDIVISIONS.map(sub => (
                <option key={sub.value} value={sub.value}>
                  {sub.symbol} {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
              Swing: {patternState.swing}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={patternState.swing}
              onChange={(e) => onPatternChange?.({ swing: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#2a2f3a] rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>
        </div>

        {/* Pattern Presets */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Pattern Presets</h3>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {PATTERN_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => setPresetPattern(preset.pattern)}
                className={`p-3 rounded-lg text-xs font-medium transition-colors text-left ${
                  JSON.stringify(preset.pattern) === JSON.stringify(patternState.pattern)
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2f3a] text-gray-300 hover:bg-[#343a47]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{preset.name}</span>
                  <span>{preset.icon}</span>
                </div>
                <div className="text-xs opacity-75 font-mono">
                  {preset.pattern.join('-')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Pattern */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Custom Pattern</h3>
          
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">
              Pattern (comma-separated)
            </label>
            <input
              type="text"
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyCustomPattern()}
              placeholder="1,2,3,4"
              className="w-full p-2 bg-[#2a2f3a] border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={applyCustomPattern}
              className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply Pattern
            </button>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-xs text-gray-400">
              <input
                type="checkbox"
                checked={patternState.repeat || false}
                onChange={(e) => onPatternChange?.({ repeat: e.target.checked })}
                className="mr-2 w-3 h-3 text-blue-600 bg-[#2a2f3a] border-gray-600 rounded focus:ring-blue-500"
              />
              Repeat pattern
            </label>
          </div>


        </div>
      </div>


    </div>
  );
};

export default PatternSystem;