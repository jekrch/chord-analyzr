// Pattern presets with rests
export const PATTERN_PRESETS = [
  // Basic patterns
  { name: 'Ascending', pattern: ['1', '2', '3', '4'], icon: '↗️', desc: 'Simple up' },
  { name: 'Descending', pattern: ['4', '3', '2', '1'], icon: '↘️', desc: 'Simple down' },
  { name: 'Up-Down', pattern: ['1', '2', '3', '4', '3', '2'], icon: '↗️↘️', desc: 'Peak wave' },
  { name: 'Down-Up', pattern: ['4', '3', '2', '1', '2', '3'], icon: '↘️↗️', desc: 'Valley wave' },
  
  // Classical patterns
  { name: 'Alberti Bass', pattern: ['1', '3', '2', '3'], icon: '🎼', desc: 'Classical' },
  { name: 'Waltz Bass', pattern: ['1', '3', '3'], icon: '🎭', desc: '3/4 time' },
  { name: 'Broken Chord', pattern: ['1', '3', '5', '3'], icon: '🎵', desc: 'Arpeggiated' },
  { name: 'Rolled Chord', pattern: ['1', '2', '3', '4', 'x', 'x'], icon: '🌊', desc: 'Quick roll' },
  
  // Rhythmic patterns
  { name: 'Syncopated', pattern: ['1', 'x', '3', 'x', '2', '4'], icon: '⚡', desc: 'Off-beat' },
  { name: 'Latin Rhythm', pattern: ['1', 'x', '1', '3', 'x', '2'], icon: '💃', desc: 'Clave feel' },
  { name: 'Reggae Skank', pattern: ['x', '2', 'x', '3'], icon: '🏝️', desc: 'Upstroke' },
  { name: 'Swing Feel', pattern: ['1', 'x', '3', '1', 'x', '2'], icon: '🎷', desc: 'Jazz swing' },
  
  // Sparse/Minimal
  { name: 'Minimal', pattern: ['1', 'x', 'x', '3', 'x', 'x'], icon: '◾', desc: 'Sparse' },
  { name: 'Half Time', pattern: ['1', 'x', '3', 'x'], icon: '⏱️', desc: 'Slower feel' },
  { name: 'Dotted', pattern: ['1', 'x', 'x', '2', 'x', 'x', '3', 'x'], icon: '⭕', desc: 'Dotted notes' },
  { name: 'Meditation', pattern: ['1', 'x', 'x', 'x', 'x', 'x'], icon: '🧘', desc: 'Very sparse' },
  
  // Heavy/Driving
  { name: 'Bass Heavy', pattern: ['1', '1', 'x', '2', '1', 'x'], icon: '🔊', desc: 'Low focus' },
  { name: 'Driving 8ths', pattern: ['1', '2', '1', '3', '1', '2', '1', '4'], icon: '🚗', desc: 'Constant motion' },
  { name: 'Power Chord', pattern: ['1', '1', '1', 'x', '1', '1', '1', 'x'], icon: '⚡', desc: 'Rock rhythm' },
  { name: 'Gallop', pattern: ['1', '1', '2', '1', '1', '3'], icon: '🐎', desc: 'Triple feel' },
  
  // Octave patterns
  { name: 'Octaves', pattern: ['1', '1+', '3', '3+'], icon: '🎹', desc: 'High/low' },
  { name: 'Bass Walk', pattern: ['1', '2', '3', '4+'], icon: '🚶', desc: 'Walking bass' },
  { name: 'High Focus', pattern: ['2+', '3+', '4+', '3+'], icon: '⬆️', desc: 'Upper register' },
  { name: 'Octave Jump', pattern: ['1', '4+', '1', '3+'], icon: '🦘', desc: 'Wide leaps' },
  
  // Complex/Polyrhythmic
  { name: 'Polyrhythm', pattern: ['1', '3', 'x', '2', '4', 'x', '1', 'x'], icon: '🌀', desc: 'Complex' },
  { name: 'Hemiola', pattern: ['1', 'x', '2', '1', 'x', '3'], icon: '🔄', desc: '3 against 2' },
  { name: 'Cascading', pattern: ['4', '3', '2', '1', '4+', '3+', '2+', '1+'], icon: '💧', desc: 'Waterfall' },
  { name: 'Interlocking', pattern: ['1', '3', '2', '4', '3', '1', '4', '2'], icon: '🔗', desc: 'Weaving' },
];

export const SUBDIVISIONS = [
  { name: 'Whole', value: 4, symbol: '𝅝' },
  { name: 'Half', value: 2, symbol: '𝅗𝅥' },
  { name: 'Quarter', value: 1, symbol: '♩' },
  { name: 'Eighth', value: 0.5, symbol: '♫' },
  { name: 'Sixteenth', value: 0.25, symbol: '𝅘𝅥𝅯' },
  { name: 'Triplet', value: 0.333, symbol: '♪3' }
];