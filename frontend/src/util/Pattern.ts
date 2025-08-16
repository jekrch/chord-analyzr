// Pattern notation:
// Numbers (1,2,3,4,5,6) = play that note from the chord
// 'x' = rest/silence
// '+' suffix (1+, 2+, etc.) = play note in higher octave

export const SUBDIVISIONS = [
  { name: "Quarter", symbol: "♩", value: 4 },
  { name: "Eighth", symbol: "♫", value: 8 },
  { name: "Sixteenth", symbol: "♬", value: 16 },
  { name: "Triplets", symbol: "♪³", value: 12 },
];

export const PATTERN_CATEGORIES = {
  BASIC: 'basic',
  RHYTHMIC: 'rhythmic', 
  ADVANCED: 'advanced',
  GENRE: 'genre'
} as const;

export type PatternCategory = typeof PATTERN_CATEGORIES[keyof typeof PATTERN_CATEGORIES];

export const PATTERN_PRESETS = [
  // ========== BASIC PATTERNS (3-4 notes) ==========
  {
    name: "Root Only",
    pattern: ["1", "x", "1", "x"],
    desc: "Simple root note emphasis",
    icon: "🎯",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Root Bass",
    pattern: ["1", "x", "x", "x", "1", "x", "x", "x"],
    desc: "Steady root note bass line",
    icon: "🎸",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Up Down",
    pattern: ["1", "2", "3", "4", "3", "2"],
    desc: "Classic ascending and descending",
    icon: "⬆️",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Broken Chord",
    pattern: ["1", "3", "2", "4"],
    desc: "Mixed chord tones",
    icon: "🔀",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Octave Jump",
    pattern: ["1", "1+", "1", "1+"],
    desc: "Root note with octave jumps",
    icon: "🦘",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Waltz",
    pattern: ["1", "2", "3"],
    desc: "Three-beat waltz pattern",
    icon: "💃",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Alberti Bass",
    pattern: ["1", "3", "2", "3", "1", "3", "2", "3"],
    desc: "Classical broken chord accompaniment",
    icon: "🎼",
    category: PATTERN_CATEGORIES.BASIC
  },

  // ========== RHYTHMIC PATTERNS ==========
  {
    name: "Syncopated",
    pattern: ["x", "1", "x", "2", "x", "3", "1", "x"],
    desc: "Off-beat emphasis",
    icon: "⚡",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Dotted Rhythm",
    pattern: ["1", "x", "x", "2", "x", "x"],
    desc: "Long-short rhythm pattern",
    icon: "🎵",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Staccato",
    pattern: ["1", "x", "2", "x", "3", "x", "4", "x"],
    desc: "Short, detached notes",
    icon: "🔸",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Legato Flow",
    pattern: ["1", "2", "3", "4", "4", "3", "2", "1"],
    desc: "Smooth, connected motion",
    icon: "🌊",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 5-NOTE CHORD PATTERNS ==========
  {
    name: "Fifth Wheel",
    pattern: ["1", "2", "3", "4", "5"],
    desc: "Simple ascent through 5-note chord",
    icon: "5️⃣",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Pentagon",
    pattern: ["1", "3", "5", "2", "4", "1"],
    desc: "Geometric pattern through 5 notes",
    icon: "⬟",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Five Alive",
    pattern: ["1", "5", "2", "4", "3", "5", "1", "x"],
    desc: "Dynamic 5-note exploration",
    icon: "🖐️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Jazz Walk",
    pattern: ["1", "2", "3", "4", "5", "4", "3", "2"],
    desc: "Walking bass with 5th extension",
    icon: "🚶",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quintet Roll",
    pattern: ["1", "x", "2", "3", "x", "4", "5", "x"],
    desc: "Rolled chord with gaps",
    icon: "🎲",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "High Five",
    pattern: ["1", "2+", "3", "4+", "5", "1+"],
    desc: "Mix of regular and high octave notes",
    icon: "🙌",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 6-NOTE CHORD PATTERNS ==========
  {
    name: "Hexagon",
    pattern: ["1", "2", "3", "4", "5", "6"],
    desc: "Complete 6-note ascent",
    icon: "⬡",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Six Pack",
    pattern: ["1", "6", "2", "5", "3", "4"],
    desc: "Outside-in pattern",
    icon: "📦",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Jazz Cascade",
    pattern: ["1", "3", "5", "6", "4", "2", "1", "x"],
    desc: "Complex jazz voicing pattern",
    icon: "🎺",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spiral Six",
    pattern: ["1", "4", "2", "5", "3", "6", "1"],
    desc: "Spiraling through 6 notes",
    icon: "🌀",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Double Triple",
    pattern: ["1", "2", "3", "4", "5", "6", "6", "5", "4", "3", "2", "1"],
    desc: "Up and down through all 6 notes",
    icon: "↕️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Sixth Sense",
    pattern: ["1", "x", "3", "x", "5", "x", "6", "x"],
    desc: "Selective 6-note chord tones",
    icon: "👁️",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },

  // ========== COMPLEX/INTERESTING PATTERNS ==========
  {
    name: "Polyrhythm",
    pattern: ["1", "x", "x", "2", "x", "3", "x", "x", "1", "x", "3", "x"],
    desc: "Complex rhythmic displacement",
    icon: "🎛️",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Bounce",
    pattern: ["1", "4", "1", "4", "2", "3", "2", "3"],
    desc: "Bouncing between chord tones",
    icon: "⚾",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Cascade",
    pattern: ["4+", "3+", "2+", "1+", "4", "3", "2", "1"],
    desc: "Waterfall effect across octaves",
    icon: "🏔️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Morse Code",
    pattern: ["1", "x", "1", "1", "x", "x", "1", "x", "1", "1", "x"],
    desc: "Dot-dash rhythm pattern",
    icon: "📡",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Fibonacci",
    pattern: ["1", "1", "2", "3", "2", "1", "3", "4"],
    desc: "Based on Fibonacci sequence",
    icon: "🌻",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Pendulum",
    pattern: ["1", "3", "2", "4", "3", "1", "2", "4", "3", "2"],
    desc: "Swinging motion through chord",
    icon: "⚖️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Stutter Step",
    pattern: ["1", "1", "x", "2", "2", "x", "3", "3", "x"],
    desc: "Repeated notes with rests",
    icon: "💬",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Call Response",
    pattern: ["1", "x", "x", "3", "2", "x", "x", "4"],
    desc: "Question and answer phrases",
    icon: "🗣️",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Spiral",
    pattern: ["1", "2", "4", "3", "1", "4", "2", "3"],
    desc: "Spiraling chord progression",
    icon: "🌪️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Latin Clave",
    pattern: ["1", "x", "x", "1", "x", "1", "x", "x"],
    desc: "Based on Latin clave rhythm",
    icon: "🥥",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },

  // ========== EXTENDED PATTERNS ==========
  {
    name: "Long Journey",
    pattern: ["1", "2", "x", "3", "4", "x", "3", "2", "1", "x", "2", "3", "4", "x", "x", "1"],
    desc: "Extended 16-step pattern",
    icon: "🛤️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Minimalist",
    pattern: ["1", "x", "x", "x", "x", "x", "x", "x"],
    desc: "Sparse, contemplative",
    icon: "🎋",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Maximalist",
    pattern: ["1", "2", "3", "4", "1+", "2+", "3+", "4+"],
    desc: "Dense, energetic pattern",
    icon: "🎆",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Ghost Notes",
    pattern: ["1", "x", "2", "x", "x", "3", "x", "4", "x", "x"],
    desc: "Implied rhythm with spaces",
    icon: "👻",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Power Chord",
    pattern: ["1", "1", "1+", "1+"],
    desc: "Rock-style power chord emphasis",
    icon: "⚡",
    category: PATTERN_CATEGORIES.BASIC
  },

  // ========== GENRE-SPECIFIC PATTERNS ==========
  {
    name: "Bossa Nova",
    pattern: ["1", "x", "2", "x", "3", "x", "4", "2"],
    desc: "Brazilian bossa nova feel",
    icon: "🏖️",
    category: PATTERN_CATEGORIES.GENRE
  },
  {
    name: "Reggae Skank",
    pattern: ["x", "2", "x", "4", "x", "2", "x", "4"],
    desc: "Reggae upstroke pattern",
    icon: "🇯🇲",
    category: PATTERN_CATEGORIES.GENRE
  },
  {
    name: "Tango",
    pattern: ["1", "x", "2", "3", "x", "x", "4", "x"],
    desc: "Dramatic tango rhythm",
    icon: "💃",
    category: PATTERN_CATEGORIES.GENRE
  },
  {
    name: "Swing Feel",
    pattern: ["1", "x", "3", "x", "2", "x", "4", "x"],
    desc: "Jazz swing pattern",
    icon: "🎷",
    category: PATTERN_CATEGORIES.GENRE
  },
  {
    name: "Folk Strum",
    pattern: ["1", "2", "3", "2", "1", "2", "3", "2"],
    desc: "Folk guitar strumming pattern",
    icon: "🪕",
    category: PATTERN_CATEGORIES.GENRE
  },

  // ========== ADVANCED 5-6 NOTE PATTERNS ==========
  {
    name: "Extended Jazz",
    pattern: ["1", "3", "5", "6", "5", "3", "1", "x"],
    desc: "Jazz chord extensions",
    icon: "🎼",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Full House",
    pattern: ["1", "2", "3", "4", "5", "6", "x", "x"],
    desc: "All chord tones, then rest",
    icon: "🏠",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Polyrhythmic 6",
    pattern: ["1", "x", "3", "x", "5", "x", "2", "x", "4", "x", "6", "x"],
    desc: "Complex 6-note polyrhythm",
    icon: "🎯",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Wave Function",
    pattern: ["1", "3", "5", "6", "4", "2", "1", "3", "5", "4", "2", "x"],
    desc: "Wave-like motion through extended chord",
    icon: "〰️",
    category: PATTERN_CATEGORIES.ADVANCED
  }
];

// Category display information for UI
export const CATEGORY_INFO = {
  [PATTERN_CATEGORIES.BASIC]: {
    name: 'Basic',
    description: 'Fundamental patterns and simple arpeggios',
    icon: '🎯'
  },
  [PATTERN_CATEGORIES.RHYTHMIC]: {
    name: 'Rhythmic',
    description: 'Patterns focused on rhythm and timing',
    icon: '🥁'
  },
  [PATTERN_CATEGORIES.ADVANCED]: {
    name: 'Advanced',
    description: 'Complex patterns and sophisticated techniques',
    icon: '🎼'
  },
  [PATTERN_CATEGORIES.GENRE]: {
    name: 'Genre',
    description: 'Style-specific patterns from various musical genres',
    icon: '🌍'
  }
} as const;

// Helper function to get patterns by category
export const getPatternsByCategory = (category: PatternCategory) => {
  return PATTERN_PRESETS.filter(pattern => pattern.category === category);
};

// Helper function to get all categories with pattern counts
export const getCategorySummary = () => {
  return Object.values(PATTERN_CATEGORIES).map(category => ({
    category,
    ...CATEGORY_INFO[category],
    count: getPatternsByCategory(category).length
  }));
};

export default PATTERN_PRESETS;