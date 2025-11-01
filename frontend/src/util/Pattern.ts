// Pattern notation:
// Numbers (1,2,3,4,5,6) = play that note from the chord
// 'x' = rest/silence
// '+' suffix (1+, 2+, etc.) = play note in higher octave

export const SUBDIVISIONS = [
  { value: 0.125, symbol: '♬', name: '32nd notes' },
  { value: 0.25, symbol: '♪', name: '16th notes' },
  { value: 0.5, symbol: '♩', name: '8th notes' },
  { value: 1.0, symbol: '♪', name: 'Quarter notes' },
  { value: 2.0, symbol: '♪', name: 'Half notes' },
];

export const PATTERN_CATEGORIES = {
  BASIC: 'basic',
  RHYTHMIC: 'rhythmic', 
  ADVANCED: 'advanced',
  GENRE: 'genre',
  CUSTOM: 'custom'
} as const;

export type PatternCategory = typeof PATTERN_CATEGORIES[keyof typeof PATTERN_CATEGORIES];

export const PATTERN_PRESETS = [
  // ========== BASIC PATTERNS (3-4 notes) ==========
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
    pattern: ["1", "4", "2", "3", "2+", "4", "5", "3"],
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
  }, 
  // ========== ADDITIONAL BASIC PATTERNS ==========
  {
    name: "Grand Scale",
    pattern: ["1", "2", "3", "4", "5", "6", "5", "4", "3", "2", "1"],
    desc: "Full scale ascent and descent",
    icon: "🎹",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Step by Step",
    pattern: ["1", "2", "1", "3", "2", "4", "3", "5", "4", "6", "5"],
    desc: "Gradual stepping pattern",
    icon: "🪜",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Simple Sixes",
    pattern: ["1", "3", "5", "1", "3", "5", "6", "4", "2", "6", "4", "2"],
    desc: "Two three-note groups with extensions",
    icon: "👥",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Double Root",
    pattern: ["1", "1", "2", "3", "4", "1", "1"],
    desc: "Root emphasis with ascent",
    icon: "🎯",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Neighbor Tones",
    pattern: ["1", "2", "1", "3", "2", "3", "4", "3"],
    desc: "Step-wise neighboring motion",
    icon: "🏠",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Triad Plus",
    pattern: ["1", "3", "5", "6", "1", "3", "5", "4"],
    desc: "Basic triad with extensions",
    icon: "➕",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Full Circle",
    pattern: ["1", "2", "3", "4", "5", "6", "6", "5", "4", "3", "2", "1", "x", "x"],
    desc: "Complete journey up and down",
    icon: "🔄",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Building Blocks",
    pattern: ["1", "1", "2", "1", "2", "3", "1", "2", "3", "4"],
    desc: "Gradually building up the chord",
    icon: "🧱",
    category: PATTERN_CATEGORIES.BASIC
  },

  // ========== ADDITIONAL RHYTHMIC PATTERNS ==========
  {
    name: "Polymetric 5",
    pattern: ["1", "x", "x", "2", "x", "3", "x", "x", "4", "x", "5", "x", "x", "1", "x"],
    desc: "Five-note pattern in complex meter",
    icon: "🎲",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Shuffle Step",
    pattern: ["1", "x", "2", "3", "x", "x", "4", "x", "5", "6", "x", "x"],
    desc: "Shuffle rhythm through extended chord",
    icon: "🃏",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Heartbeat",
    pattern: ["1", "1", "x", "x", "2", "2", "x", "x", "3", "3", "x", "x"],
    desc: "Pulse-like doubled pattern",
    icon: "💓",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Cross Rhythm",
    pattern: ["1", "x", "x", "2", "x", "x", "3", "x", "4", "x", "x", "5", "x", "x", "6"],
    desc: "Pattern crossing metric boundaries",
    icon: "❌",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Breath Mark",
    pattern: ["1", "2", "3", "x", "x", "4", "5", "6", "x", "x", "1", "2", "x", "x"],
    desc: "Groups of notes with breathing spaces",
    icon: "🫁",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Displacement",
    pattern: ["x", "1", "x", "2", "x", "3", "1", "x", "2", "x", "3", "x", "4", "x"],
    desc: "Rhythmically displaced chord tones",
    icon: "📐",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Echo Chamber",
    pattern: ["1", "x", "1", "x", "x", "2", "x", "2", "x", "x", "3", "x", "3", "x", "x"],
    desc: "Each note echoes with delays",
    icon: "📢",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Odd Meter",
    pattern: ["1", "x", "2", "x", "3", "x", "x", "4", "x", "5", "x", "6", "x", "x"],
    desc: "Seven-beat groupings",
    icon: "7️⃣",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Metric Modulation",
    pattern: ["1", "2", "x", "3", "4", "x", "x", "5", "6", "x", "1", "x", "x", "2", "x"],
    desc: "Changing rhythmic emphasis",
    icon: "🔄",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },

  // ========== ADDITIONAL ADVANCED PATTERNS ==========
  {
    name: "Chromatic Walk",
    pattern: ["1", "2", "3", "4", "5", "6", "5", "4", "3", "2", "1", "2", "3", "4", "5", "6"],
    desc: "Extended chromatic voice leading",
    icon: "🚶‍♂️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Voice Exchange",
    pattern: ["1", "6", "2", "5", "3", "4", "4", "3", "5", "2", "6", "1"],
    desc: "Voices trading positions",
    icon: "🔄",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Nested Loops",
    pattern: ["1", "3", "5", "3", "1", "4", "6", "4", "2", "5", "6", "5", "2", "1"],
    desc: "Loops within loops structure",
    icon: "🪆",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Golden Ratio",
    pattern: ["1", "2", "3", "5", "6", "4", "1", "3", "5", "6", "2", "4", "1"],
    desc: "Based on mathematical proportions",
    icon: "📐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Fractal Pattern",
    pattern: ["1", "3", "2", "1", "4", "6", "5", "4", "1", "3", "2", "1"],
    desc: "Self-similar pattern at different scales",
    icon: "🌿",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Intervallic Series",
    pattern: ["1", "4", "2", "5", "3", "6", "1", "5", "2", "6", "3", "4"],
    desc: "Systematic interval exploration",
    icon: "📏",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Orbit",
    pattern: ["1", "3", "5", "2", "4", "6", "3", "5", "1", "4", "6", "2", "5", "1", "6"],
    desc: "Circular motion through chord space",
    icon: "🪐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Double Helix",
    pattern: ["1", "6", "2", "5", "3", "4", "3+", "4+", "2+", "5+", "1+", "6+", "1+"],
    desc: "Intertwining ascending and descending lines",
    icon: "🧬",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Metamorphosis",
    pattern: ["1", "2", "1", "3", "2", "4", "3", "5", "4", "6", "5", "6", "1+", "2+"],
    desc: "Gradually transforming pattern",
    icon: "🦋",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Tessellation",
    pattern: ["1", "3", "6", "4", "2", "5", "1", "4", "6", "3", "2", "5"],
    desc: "Interlocking geometric pattern",
    icon: "🔷",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Prime Number",
    pattern: ["1", "x", "2", "x", "x", "3", "x", "x", "x", "x", "5", "x", "x", "x", "x", "x", "x"],
    desc: "Based on prime number sequence",
    icon: "🔢",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Matrix",
    pattern: ["1", "2", "3", "4+", "5+", "6+", "6", "5", "4", "3+", "2+", "1+"],
    desc: "Systematic octave displacement matrix",
    icon: "🎯",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Mandala",
    pattern: ["1", "x", "3", "x", "5", "x", "6", "x", "4", "x", "2", "x", "1", "x"],
    desc: "Symmetric spiritual geometry",
    icon: "🕉️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Infinity Loop",
    pattern: ["1", "2", "3", "4", "5", "6", "5", "4", "3", "2", "1", "6", "5", "4", "3", "2", "1"],
    desc: "Never-ending loop pattern",
    icon: "♾️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quantum Jump",
    pattern: ["1", "4+", "2", "5+", "x", "3", "6+", "x", "1+", "4", "x", "2+", "5"],
    desc: "Unpredictable quantum-like leaps",
    icon: "⚛️",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== LARGE EXPLORATORY PATTERNS ==========
  {
    name: "Epic Journey",
    pattern: ["1", "2", "3", "4", "5", "6", "6+", "5+", "4+", "3+", "2+", "1+", "6", "5", "4", "3", "2", "1", "x", "x"],
    desc: "20-step odyssey through all chord tones",
    icon: "🗺️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Full Spectrum",
    pattern: ["1", "x", "2", "x", "3", "x", "4", "x", "5", "x", "6", "x", "1+", "x", "2+", "x", "3+", "x"],
    desc: "Complete chord exploration with rests",
    icon: "🌈",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Polyrhythmic Marathon",
    pattern: ["1", "x", "x", "2", "x", "3", "x", "x", "4", "x", "5", "x", "x", "6", "x", "1+", "x", "x", "2+", "x"],
    desc: "Extended polyrhythmic exploration",
    icon: "🏃‍♀️",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Dimensional Shift",
    pattern: ["1", "3", "5", "1+", "3+", "5+", "6+", "4+", "2+", "6", "4", "2", "1", "2", "3", "4", "5", "6"],
    desc: "Moving between octave dimensions",
    icon: "🌌",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quick Five",
    pattern: ["1", "2", "3", "4", "5", "1"],
    desc: "Efficient 5-note exploration",
    icon: "⚡",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Hex Core",
    pattern: ["1", "3", "5", "2", "4", "6"],
    desc: "All 6 notes in compact form",
    icon: "⬡",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Jazz Snap",
    pattern: ["1", "3", "6", "4", "2", "5"],
    desc: "Quick jazz chord exploration",
    icon: "🎺",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Prism",
    pattern: ["1", "4", "6", "3", "5", "2"],
    desc: "Light refraction pattern",
    icon: "💎",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Star Map",
    pattern: ["1", "5", "2", "6", "3", "4"],
    desc: "Navigating chord constellation",
    icon: "⭐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Speed Dial",
    pattern: ["1", "2", "4", "5", "6", "3"],
    desc: "Quick access to extended tones",
    icon: "📞",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Kaleidoscope",
    pattern: ["1", "6", "4", "2", "5", "3"],
    desc: "Shifting colorful pattern",
    icon: "🔮",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Magnetic",
    pattern: ["1", "3", "5", "6", "4", "2"],
    desc: "Attraction between chord tones",
    icon: "🧲",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quantum Six",
    pattern: ["6", "1", "4", "2", "5", "3"],
    desc: "Non-linear quantum exploration",
    icon: "⚛️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Crystal",
    pattern: ["1", "4", "2", "5", "3", "6"],
    desc: "Crystalline structure pattern",
    icon: "💎",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 8-STEP PATTERNS ==========
  {
    name: "Octagon",
    pattern: ["1", "2", "3", "4", "5", "6", "5", "4"],
    desc: "8-sided geometric exploration",
    icon: "⬛",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Double Helix 6",
    pattern: ["1", "6", "2", "5", "3", "4", "3+", "1+"],
    desc: "DNA-like interweaving pattern",
    icon: "🧬",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Infinity 5",
    pattern: ["1", "3", "5", "4", "2", "4", "5", "1"],
    desc: "Figure-8 through 5 chord tones",
    icon: "♾️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Compass Rose",
    pattern: ["1", "4", "6", "3", "2", "5", "1", "6"],
    desc: "Navigate all directions",
    icon: "🧭",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quick March",
    pattern: ["1", "2", "3", "4", "5", "6", "1+", "x"],
    desc: "Military precision through chord",
    icon: "🥾",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Ripple Effect",
    pattern: ["1", "3", "5", "2", "4", "6", "4", "2"],
    desc: "Waves expanding outward",
    icon: "🌊",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spider Web",
    pattern: ["1", "4", "2", "6", "3", "5", "1+", "4"],
    desc: "Intricate connecting pattern",
    icon: "🕸️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Gear Shift",
    pattern: ["1", "2", "4", "3", "5", "6", "5", "2"],
    desc: "Mechanical shifting motion",
    icon: "⚙️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Phoenix Rise",
    pattern: ["1", "3", "5", "6", "4", "2", "5+", "1+"],
    desc: "Rising from ashes pattern",
    icon: "🔥",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Molecule",
    pattern: ["1", "6", "3", "2", "5", "4", "6+", "1+"],
    desc: "Chemical bond structure",
    icon: "⚗️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Time Warp",
    pattern: ["1", "5", "2", "4", "6", "3", "1+", "5"],
    desc: "Bending through chord space-time",
    icon: "⏰",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Magic Square",
    pattern: ["1", "4", "6", "2", "3", "5", "4+", "1+"],
    desc: "Mathematical magic pattern",
    icon: "🔢",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Synth Wave",
    pattern: ["1", "2", "4", "6", "5", "3", "2+", "1+"],
    desc: "Electronic wave synthesis",
    icon: "🎛️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Butterfly",
    pattern: ["1", "3", "6", "4", "2", "5", "3+", "1+"],
    desc: "Graceful wing-like motion",
    icon: "🦋",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Binary Code",
    pattern: ["1", "x", "2", "3", "4", "5", "6", "x"],
    desc: "Digital pattern with gaps",
    icon: "💻",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Vortex",
    pattern: ["1", "6", "4", "2", "5", "3", "6+", "1+"],
    desc: "Spiraling energy pattern",
    icon: "🌪️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Lightning",
    pattern: ["1", "4", "6", "2", "5", "3", "1+", "x"],
    desc: "Zigzag electrical pattern",
    icon: "⚡",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Honeycomb",
    pattern: ["1", "3", "5", "2", "6", "4", "5+", "1+"],
    desc: "Hexagonal bee pattern",
    icon: "🍯",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Tidal Wave",
    pattern: ["1", "2", "4", "5", "6", "3", "2+", "1+"],
    desc: "Ocean wave crescendo",
    icon: "🌊",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Satellite",
    pattern: ["1", "5", "3", "6", "2", "4", "1+", "5+"],
    desc: "Orbital motion pattern",
    icon: "🛰️",
    category: PATTERN_CATEGORIES.ADVANCED
  }, 
  {
    name: "Quad Core",
    pattern: ["1", "2", "3", "4", "3", "2"],
    desc: "4-note mountain shape",
    icon: "🏔️",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Square Dance",
    pattern: ["1", "3", "2", "4", "1", "3"],
    desc: "4-note folk pattern",
    icon: "💃",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Tetris Block",
    pattern: ["1", "4", "2", "3", "4", "1", "2", "3"],
    desc: "Interlocking 4-note pattern",
    icon: "🧩",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Compass",
    pattern: ["1", "2", "4", "3", "1", "4"],
    desc: "4-direction navigation",
    icon: "🧭",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Engine Cycle",
    pattern: ["1", "3", "4", "2", "1", "3", "4", "2"],
    desc: "Repeating 4-stroke pattern",
    icon: "🚗",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Diamond",
    pattern: ["1", "2", "4", "3", "2", "1"],
    desc: "Diamond-shaped 4-note gem",
    icon: "💎",
    category: PATTERN_CATEGORIES.BASIC
  },

  // ========== 5-NOTE PATTERNS (6-8 steps) ==========
  {
    name: "Pentagon Path",
    pattern: ["1", "2", "3", "4", "5", "1"],
    desc: "5-sided geometric progression",
    icon: "⬟",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Star Jump",
    pattern: ["1", "3", "5", "2", "4", "1"],
    desc: "5-pointed star navigation",
    icon: "⭐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "High Five",
    pattern: ["1", "2", "3", "4", "5", "1+"],
    desc: "5-note celebration with octave",
    icon: "🙌",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Flower Power",
    pattern: ["1", "3", "2", "5", "4", "1", "3", "5"],
    desc: "5-petal blooming pattern",
    icon: "🌸",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Olympic Rings",
    pattern: ["1", "4", "2", "5", "3", "4"],
    desc: "Interlocking 5-note circles",
    icon: "🏅",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Jazz Hand",
    pattern: ["1", "2", "4", "3", "5", "2", "1", "4"],
    desc: "5-finger jazz expression",
    icon: "🎭",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spiral Five",
    pattern: ["1", "3", "5", "4", "2", "3"],
    desc: "Spiraling 5-note motion",
    icon: "🌀",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Power Plant",
    pattern: ["1", "5", "3", "2", "4", "1+"],
    desc: "Energy-generating 5-note pattern",
    icon: "⚡",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 6-NOTE PATTERNS (6-8 steps) ==========
  {
    name: "Full House",
    pattern: ["1", "2", "3", "4", "5", "6"],
    desc: "Complete 6-note ascent",
    icon: "🏠",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Hexagon Spin",
    pattern: ["1", "3", "5", "2", "4", "6"],
    desc: "6-sided rotating pattern",
    icon: "⬡",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Rainbow Arc",
    pattern: ["1", "6", "2", "5", "3", "4"],
    desc: "6-color spectrum bridge",
    icon: "🌈",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Dice Roll",
    pattern: ["1", "4", "6", "2", "5", "3"],
    desc: "Random 6-sided exploration",
    icon: "🎲",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spider Legs",
    pattern: ["1", "2", "4", "6", "3", "5", "1", "4"],
    desc: "8-legged 6-note crawl",
    icon: "🕷️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Snowflake",
    pattern: ["1", "6", "3", "4", "2", "5"],
    desc: "6-sided crystalline beauty",
    icon: "❄️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Benzene Ring",
    pattern: ["1", "2", "4", "5", "3", "6", "1", "4"],
    desc: "Chemical 6-carbon structure",
    icon: "⚗️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Clock Face",
    pattern: ["1", "3", "6", "4", "2", "5"],
    desc: "12-hour time navigation",
    icon: "🕐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Mandala Six",
    pattern: ["1", "4", "2", "6", "3", "5", "1", "6"],
    desc: "Sacred 6-fold geometry",
    icon: "🕉️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Puzzle Piece",
    pattern: ["1", "5", "2", "4", "6", "3"],
    desc: "Interlocking 6-note solution",
    icon: "🧩",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 7-NOTE PATTERNS (7-8 steps with octaves) ==========
  {
    name: "Rainbow Bridge",
    pattern: ["1", "2", "3", "4", "5", "6", "1+"],
    desc: "Complete 7-tone spectrum",
    icon: "🌈",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Lucky Seven",
    pattern: ["1", "3", "5", "6", "4", "2", "1+", "3+"],
    desc: "7-note fortune pattern",
    icon: "🍀",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Chakra Flow",
    pattern: ["1", "2", "3", "4", "5", "6", "1+"],
    desc: "7-energy center alignment",
    icon: "🧘",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Week Days",
    pattern: ["1", "4", "2", "6", "3", "5", "1+", "4+"],
    desc: "7-day cycle pattern",
    icon: "📅",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Heptagon",
    pattern: ["1", "3", "6", "2", "5", "4", "1+"],
    desc: "7-sided geometric form",
    icon: "🔷",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Scale Heaven",
    pattern: ["1", "2", "3", "4", "5", "6", "2+", "1+"],
    desc: "7-note stairway to heaven",
    icon: "🪜",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Prism Split",
    pattern: ["1", "6", "4", "2", "5", "3", "1+"],
    desc: "Light splitting into 7 colors",
    icon: "💎",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Musical Bowl",
    pattern: ["1", "2", "4", "6", "3", "5", "1+", "4+"],
    desc: "7-tone singing bowl",
    icon: "🎵",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== MIXED CREATIVE PATTERNS ==========
  {
    name: "Fusion Dance",
    pattern: ["1", "3", "6", "4", "2", "5"],
    desc: "6-note fusion choreography",
    icon: "🕺",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Crystal Grid",
    pattern: ["1", "4", "3", "6", "2", "5", "1+", "4+"],
    desc: "6-point energy crystal matrix",
    icon: "💎",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Gear Train",
    pattern: ["1", "2", "4", "3", "6", "5"],
    desc: "Mechanical 6-gear system",
    icon: "⚙️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "DNA Strand",
    pattern: ["1", "5", "2", "6", "3", "4", "1+", "5+"],
    desc: "Double helix genetic code",
    icon: "🧬",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Meteor Shower",
    pattern: ["1", "6", "3", "5", "2", "4"],
    desc: "6-streak cosmic display",
    icon: "☄️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Magic Circle",
    pattern: ["1", "3", "2", "6", "4", "5", "1+"],
    desc: "7-point mystical protection",
    icon: "🔮",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Tornado Spin",
    pattern: ["1", "4", "6", "3", "2", "5", "1+", "4+"],
    desc: "Spiraling 7-note vortex",
    icon: "🌪️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Phoenix Wings",
    pattern: ["1", "2", "5", "6", "3", "4"],
    desc: "6-feather wing spread",
    icon: "🔥",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  // ========== 4-NOTE PATTERNS (8 steps) ==========
  {
    name: "Quad Echo",
    pattern: ["1", "2", "1", "3", "2", "4", "3", "4"],
    desc: "4-note echo chamber",
    icon: "📢",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Four Corners",
    pattern: ["1", "3", "4", "2", "1", "3", "4", "2"],
    desc: "Repeating 4-corner square",
    icon: "🔲",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Heartbeat Quad",
    pattern: ["1", "1", "2", "3", "3", "4", "2", "4"],
    desc: "Pulsing 4-note rhythm",
    icon: "💓",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Compass Spin",
    pattern: ["1", "2", "4", "3", "2", "1", "4", "3"],
    desc: "4-direction circular motion",
    icon: "🧭",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Engine Rev",
    pattern: ["1", "4", "2", "3", "4", "1", "3", "2"],
    desc: "4-cylinder engine pattern",
    icon: "🏎️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Square Wave",
    pattern: ["1", "1", "3", "3", "2", "2", "4", "4"],
    desc: "Digital square wave form",
    icon: "⬛",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Four Seasons",
    pattern: ["1", "2", "3", "4", "2+", "1", "4", "3"],
    desc: "Seasonal cycle pattern",
    icon: "🍂",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Card Suit",
    pattern: ["1", "3", "2", "4", "3+", "1+", "2", "4"],
    desc: "Playing card 4-suit pattern",
    icon: "🃏",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quad Pulse",
    pattern: ["1", "2", "2", "3", "3+", "4+", "4", "1"],
    desc: "Doubled pulse pattern",
    icon: "⚡",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Element Mix",
    pattern: ["1", "4", "3", "2", "1", "2", "3", "4"],
    desc: "4-element combination",
    icon: "🔥",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 5-NOTE PATTERNS (8 steps) ==========
  {
    name: "Pentagon Echo",
    pattern: ["1", "2", "3", "4", "5", "1", "3", "5"],
    desc: "5-note with strategic repeats",
    icon: "⬟",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Five Alive",
    pattern: ["1", "3", "5", "2", "4", "1", "5", "3"],
    desc: "Dynamic 5-note exploration",
    icon: "🖐️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Star Circuit",
    pattern: ["1", "2", "4", "5", "3", "2", "4", "1"],
    desc: "5-pointed star electrical circuit",
    icon: "⭐",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Olympic Flow",
    pattern: ["1", "3", "2", "5", "4", "3", "1", "5"],
    desc: "5-ring Olympic movement",
    icon: "🏅",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Hand Jive",
    pattern: ["1", "2", "3", "4", "5", "2", "4", "3"],
    desc: "5-finger dance pattern",
    icon: "✋",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Jazz Fifth",
    pattern: ["1", "3", "5", "4", "2", "5", "1", "3"],
    desc: "Jazz 5-note improvisation",
    icon: "🎺",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Flower Bloom",
    pattern: ["1", "2", "4", "3", "5", "4", "2", "1"],
    desc: "5-petal opening flower",
    icon: "🌺",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spiral Five",
    pattern: ["1", "5", "3", "2", "4", "5", "3", "1"],
    desc: "Spiraling 5-note motion",
    icon: "🌀",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Pentagon March",
    pattern: ["1", "2", "3", "4", "5", "4", "3", "2"],
    desc: "Military 5-count march",
    icon: "🥾",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Five Elements",
    pattern: ["1", "4", "2", "5", "3", "4", "1+", "5+"],
    desc: "Ancient 5-element cycle",
    icon: "🌊",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Quintet Jam",
    pattern: ["1", "3", "4", "2", "5", "3", "4", "1"],
    desc: "5-piece band improvisation",
    icon: "🎵",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Five Fold",
    pattern: ["1", "5", "2", "4", "3", "2", "5", "4"],
    desc: "5-fold symmetrical pattern",
    icon: "🔷",
    category: PATTERN_CATEGORIES.ADVANCED
  },

  // ========== 6-NOTE PATTERNS (8 steps) ==========
  {
    name: "Hex Repeat",
    pattern: ["1", "2", "3", "4", "5", "6", "1", "4"],
    desc: "6-note with strategic repeats",
    icon: "⬡",
    category: PATTERN_CATEGORIES.BASIC
  },
  {
    name: "Rainbow Fade",
    pattern: ["1", "6", "2", "5", "3", "4", "6", "1"],
    desc: "6-color spectrum fade",
    icon: "🌈",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Snowflake Dance",
    pattern: ["1", "3", "6", "4", "2", "5", "3", "1"],
    desc: "6-sided crystal dance",
    icon: "❄️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Benzene Loop",
    pattern: ["1", "2", "4", "5", "3", "6", "2", "4"],
    desc: "Chemical 6-carbon ring",
    icon: "⚗️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Dice Double",
    pattern: ["1", "4", "6", "2", "5", "3", "4", "6"],
    desc: "6-sided die double roll",
    icon: "🎲",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Hexagon Twist",
    pattern: ["1", "3", "5", "2", "4", "6", "3", "5"],
    desc: "6-sided geometric twist",
    icon: "⬡",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Clock Tick",
    pattern: ["1", "2", "4", "6", "3", "5", "2", "6"],
    desc: "6-hour time progression",
    icon: "🕐",
    category: PATTERN_CATEGORIES.RHYTHMIC
  },
  {
    name: "Mandala Six",
    pattern: ["1", "4", "2", "6", "3", "5", "4", "2"],
    desc: "Sacred 6-fold pattern",
    icon: "🕉️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Flower Power",
    pattern: ["1", "6", "3", "2", "5", "4", "6", "3"],
    desc: "6-petal power flower",
    icon: "🌻",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Insect Walk",
    pattern: ["1", "2", "4", "3", "6", "5", "2", "4"],
    desc: "6-legged insect movement",
    icon: "🐛",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Crystal Matrix",
    pattern: ["1", "5", "3", "6", "2", "4", "5", "3"],
    desc: "6-point crystal energy grid",
    icon: "💎",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Spinner Six",
    pattern: ["1", "3", "6", "2", "4", "5", "3", "6"],
    desc: "6-blade spinner pattern",
    icon: "🔄",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Web Weave",
    pattern: ["1", "4", "6", "3", "2", "5", "4", "1"],
    desc: "6-strand web weaving",
    icon: "🕸️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Honeycomb Flow",
    pattern: ["1", "2", "5", "6", "3", "4", "2", "5"],
    desc: "6-sided honeycomb flow",
    icon: "🍯",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Gear Mesh",
    pattern: ["1", "6", "4", "2", "5", "3", "6", "4"],
    desc: "6-tooth gear meshing",
    icon: "⚙️",
    category: PATTERN_CATEGORIES.ADVANCED
  },
  {
    name: "Jazz Hexagon",
    pattern: ["1", "3+", "5", "6+", "4", "2+", "3", "5+"],
    desc: "6-note jazz with octave sophistication",
    icon: "🎷",
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
  },
  [PATTERN_CATEGORIES.CUSTOM]: {
    name: 'Custom',
    description: 'User-created patterns from added chords',
    icon: '🎨'
  },
} as const;

// Helper function to get patterns by category
export const getPatternsByCategory = (category: PatternCategory) => {
  return category; //PATTERN_PRESETS.filter(pattern => pattern.category === category);
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