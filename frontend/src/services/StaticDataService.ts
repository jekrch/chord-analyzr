/**
 * Updated Static Data Service
 * Handles loading data from static JSON files and integrates with dynamic chord generation
 */

import type { ModeDto, ModeScaleChordDto, ScaleNoteDto } from '../api';
import { dynamicChordGenerator } from './DynamicChordService';

interface StaticDataIndex {
  generated_at: string;
  modes: ModeDto[];
  available_files: {
    modes: string;
    chords_by_mode: string[];
    scales_by_mode: string[];
  };
}

interface ScalesByKey {
  [key: string]: ScaleNoteDto[];
}

class StaticDataService {
  private baseUrl = `${import.meta.env.BASE_URL}data`;
  private indexCache: StaticDataIndex | null = null;
  private modesCache: ModeDto[] | null = null;
  private scalesCache: Map<string, ScalesByKey> = new Map();
  private distinctChordsCache: Map<string, ModeScaleChordDto[]> = new Map();
  private useDynamicChords = true; // Toggle between static and dynamic chord generation

  /**
   * Normalizes a musical key string to have the first letter capitalized
   * and the rest in lowercase. e.g., "c# ", "F#", "ab" -> "C#", "F#", "Ab"
   */
  public normalizeKey(key: string): string {
    const trimmedKey = key.trim();
    if (trimmedKey.length === 0) {
      return '';
    }
    return trimmedKey.charAt(0).toUpperCase() + trimmedKey.slice(1).toLowerCase();
  }

  /**
   * Toggle between dynamic and static chord generation
   */
  public setUseDynamicChords(useDynamic: boolean): void {
    this.useDynamicChords = useDynamic;
    // Clear chord cache when switching modes
    this.distinctChordsCache.clear();
  }

  /**
   * Load and cache the index file
   */
  private async loadIndex(): Promise<StaticDataIndex> {
    if (this.indexCache) {
      return this.indexCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/index.json`);
      if (!response.ok) {
        throw new Error(`Failed to load index: ${response.statusText}`);
      }
      this.indexCache = await response.json();
      return this.indexCache!;
    } catch (error) {
      console.error('Error loading static data index:', error);
      throw new Error('Failed to load static data. Please ensure the data generation completed successfully.');
    }
  }

  /**
   * Load modes from static data
   */
  async getModes(): Promise<ModeDto[]> {
    if (this.modesCache) {
      return this.modesCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/modes.json`);
      if (!response.ok) {
        throw new Error(`Failed to load modes: ${response.statusText}`);
      }
      this.modesCache = await response.json();
      return this.modesCache!;
    } catch (error) {
      //console.error('Error loading modes from static data:', error);
      throw error;
    }
  }

  /**
   * Load chords for a specific mode and key from static data OR generate dynamically
   * By default, only returns chords that fit within the scale (compatible chords)
   */
  async getModeKeyChords(key: string, mode: string, includeAllChords: boolean = false): Promise<ModeScaleChordDto[]> {
    const normalizedKey = this.normalizeKey(key);

    if (this.useDynamicChords) {
      try {
        // Generate chords dynamically (compatible by default)
        const dynamicChords = await dynamicChordGenerator.generateChordsForScale(normalizedKey, mode, includeAllChords);
        
        // Convert to ModeScaleChordDto format
        return dynamicChords.map(chord => ({
          keyName: chord.keyName,
          modeId: chord.modeId,
          chordNote: chord.chordNote,
          chordNoteName: chord.chordNoteName,
          chordName: chord.chordName,
          chordNotes: chord.chordNotes,
          chordNoteNames: chord.chordNoteNames
        }));
      } catch (error) {
        console.warn('Dynamic chord generation failed, falling back to static data:', error);
        // Fall back to static data if dynamic generation fails
      }
    }

    // Static data fallback or when dynamic chords are disabled
    try {
      // First, get the index to find available modes
      const index = await this.loadIndex();

      // Find the mode ID for the given mode name
      const modeData = index.modes.find(m => m.name === mode);

      if (!modeData || !modeData.id) {
        throw new Error(`Mode "${mode}" not found`);
      }

      const modeId = modeData.id.toString();

      // Load chords for this mode (if static files exist)
      const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load chords for mode ${mode}: ${response.statusText}`);
      }
      const allChords: ModeScaleChordDto[] = await response.json();

      // Filter by key
      const keyChords = allChords.filter(chord => chord.keyName === normalizedKey);

      // If includeAllChords is false, filter for compatibility (static files already filtered by default)
      return keyChords;
    } catch (error) {
      console.error('Error loading chords from static data:', error);
      throw error;
    }
  }

  /**
   * Get chords that fit perfectly within a scale (no notes outside the scale)
   */
  async getCompatibleChords(key: string, mode: string): Promise<ModeScaleChordDto[]> {
    if (this.useDynamicChords) {
      try {
        const normalizedKey = this.normalizeKey(key);
        const compatibleChords = await dynamicChordGenerator.getCompatibleChords(normalizedKey, mode);
        
        return compatibleChords.map(chord => ({
          keyName: chord.keyName,
          modeId: chord.modeId,
          chordNote: chord.chordNote,
          chordNoteName: chord.chordNoteName,
          chordName: chord.chordName,
          chordNotes: chord.chordNotes,
          chordNoteNames: chord.chordNoteNames
        }));
      } catch (error) {
        console.warn('Dynamic compatible chord generation failed:', error);
      }
    }

    // Fallback: filter existing chords for compatibility
    const allChords = await this.getModeKeyChords(key, mode);
    const scaleNotes = await this.getScaleNotes(key, mode);
    
    const scaleNoteNumbers = scaleNotes.map(note => {
      const noteMap: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'Fb': 4,
        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11, 'B#': 0, 'Cb': 11
      };
      const noteNum = noteMap[note.noteName!] ?? 0;
      return ((noteNum % 12) + 12) % 12;
    });

    return allChords.filter(chord => {
      if (!chord.chordNotes) return false;
      
      const chordNoteNumbers = chord.chordNotes.split(', ').map(n => 
        ((parseInt(n.trim()) % 12) + 12) % 12
      );
      
      return chordNoteNumbers.every(note => scaleNoteNumbers.includes(note));
    });
  }

  /**
   * Generate a specific chord
   */
  async generateSpecificChord(rootNote: string, chordType: string, key: string, mode: string): Promise<ModeScaleChordDto | null> {
    if (!this.useDynamicChords) {
      throw new Error('Dynamic chord generation is disabled');
    }

    try {
      const normalizedKey = this.normalizeKey(key);
      const chord = await dynamicChordGenerator.generateChord(rootNote, chordType, normalizedKey, mode);
      
      if (!chord) return null;

      return {
        keyName: chord.keyName,
        modeId: chord.modeId,
        chordNote: chord.chordNote,
        chordNoteName: chord.chordNoteName,
        chordName: chord.chordName,
        chordNotes: chord.chordNotes,
        chordNoteNames: chord.chordNoteNames
      };
    } catch (error) {
      console.error('Error generating specific chord:', error);
      return null;
    }
  }

  /**
   * Get all available chord types (when using dynamic generation)
   */
  getAvailableChordTypes(): string[] {
    return dynamicChordGenerator.getChordTypes();
  }

  /**
   * Load scale notes for a specific mode and key from static data
   */
  async getScaleNotes(key: string, mode: string): Promise<ScaleNoteDto[]> {
    try {
      const normalizedKey = this.normalizeKey(key);

      // First, get the index to find available modes
      const index = await this.loadIndex();

      // Find the mode ID for the given mode name
      const modeData = index.modes.find(m => m.name === mode);
      if (!modeData || !modeData.id) {
        throw new Error(`Mode "${mode}" not found`);
      }

      const modeId = modeData.id.toString();

      // Check cache first
      if (this.scalesCache.has(modeId)) {
        const cached = this.scalesCache.get(modeId)!;
        return cached[normalizedKey] || [];
      }

      // Load scales for this mode
      const response = await fetch(`${this.baseUrl}/scales-mode-${modeId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load scales for mode ${mode}: ${response.statusText}`);
      }

      const scalesByKey: ScalesByKey = await response.json();
      this.scalesCache.set(modeId, scalesByKey);

      return scalesByKey[normalizedKey] || [];
    } catch (error) {
      console.error('Error loading scale notes from static data:', error);
      throw error;
    }
  }

  /**
   * Helper to convert note name to MIDI note number (0-11)
   */
  private noteNameToNumber(noteName: string): number {
    if (!noteName || noteName.length === 0) return 0;

    const baseNote = noteName.charAt(0).toUpperCase();
    const accidentals = noteName.slice(1).replace(/\d+/g, ''); // Remove octave numbers

    const baseNoteMap: Record<string, number> = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };

    let midiNote = baseNoteMap[baseNote];
    if (midiNote === undefined) return 0;

    const sharps = (accidentals.match(/#/g) || []).length;
    const flats = (accidentals.match(/b/g) || []).length;

    midiNote += sharps;
    midiNote -= flats;

    return ((midiNote % 12) + 12) % 12;
  }

  /**
   * Get the best root note name for a chromatic note number in the given key/mode context
   */
  private async getBestRootNoteName(
    chromaticNote: number,
    scaleNotes: ScaleNoteDto[],
    keyName: string
  ): Promise<string> {
    const normalizedNote = ((chromaticNote % 12) + 12) % 12;

    // First, check if this note is in the scale
    const scaleNote = scaleNotes.find(note => {
      const noteNum = this.noteNameToNumber(note.noteName!);
      return noteNum === normalizedNote;
    });

    if (scaleNote?.noteName) {
      return scaleNote.noteName;
    }

    // For chromatic notes outside the scale, determine accidental convention from the scale
    const chromaticNotesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const chromaticNotesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Check if the scale contains any flats (excluding the key name itself)
    const scaleUsesFlats = scaleNotes.some(note => 
      note.noteName && note.noteName.includes('b')
    );
    
    // Also check if the key name itself has a flat
    const keyHasFlat = keyName.includes('b');

    // Use flats if either the key or scale uses flats
    if (scaleUsesFlats || keyHasFlat) {
      return chromaticNotesFlat[normalizedNote];
    } else {
      return chromaticNotesSharp[normalizedNote];
    }
  }

  /**
   * Get all distinct chords across all chord types for a specific key/mode context
   * This generates chords for all 12 chromatic root notes using proper note naming
   */
  async getAllDistinctChords(key: string, mode: string): Promise<ModeScaleChordDto[]> {
    const normalizedKey = this.normalizeKey(key);
    const cacheKey = `${normalizedKey}-${mode}`;

    // Return cached result if available
    if (this.distinctChordsCache.has(cacheKey)) {
      return this.distinctChordsCache.get(cacheKey)!;
    }

    if (this.useDynamicChords) {
      try {
        // Get scale notes for proper note naming context
        const scaleNotes = await this.getScaleNotes(normalizedKey, mode);
        const modes = await this.getModes();
        const modeData = modes.find(m => m.name === mode);
        
        if (!modeData?.id) {
          throw new Error(`Mode "${mode}" not found`);
        }

        const allChords: ModeScaleChordDto[] = [];
        const chordTypes = dynamicChordGenerator.getChordTypes();

        // Generate all chord types on all 12 chromatic root notes
        for (let chromaticNote = 0; chromaticNote < 12; chromaticNote++) {
          // Get the best note name for this root in this key/mode context
          const rootNoteName = await this.getBestRootNoteName(
            chromaticNote,
            scaleNotes,
            normalizedKey
          );

          // Generate all chord types on this root
          for (const chordType of chordTypes) {
            try {
              const chord = await dynamicChordGenerator.generateChord(
                rootNoteName,
                chordType,
                normalizedKey,
                mode
              );

              if (chord) {
                allChords.push({
                  keyName: chord.keyName,
                  modeId: chord.modeId,
                  chordNote: chord.chordNote,
                  chordNoteName: chord.chordNoteName,
                  chordName: chord.chordName,
                  chordNotes: chord.chordNotes,
                  chordNoteNames: chord.chordNoteNames
                });
              }
            } catch (error) {
              console.warn(`Error generating ${rootNoteName}${chordType}:`, error);
            }
          }
        }

        // Deduplicate enharmonic equivalents, preferring scale-appropriate note names
        const deduplicated = this.deduplicateChordsByNoteContent(
          allChords,
          scaleNotes,
          normalizedKey
        );

        this.distinctChordsCache.set(cacheKey, deduplicated);
        return deduplicated;
      } catch (error) {
        console.warn('Dynamic distinct chord generation failed, falling back to static data:', error);
      }
    }

    // Static data fallback
    try {
      const index = await this.loadIndex();
      const allChords: ModeScaleChordDto[] = [];

      // Load chord data for each mode
      for (const modeEntry of index.modes) {
        if (!modeEntry.id) continue;
        
        const modeId = modeEntry.id.toString();
        
        try {
          const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
          if (!response.ok) {
            console.warn(`Failed to load chords for mode ${modeEntry.name} (ID: ${modeId}): ${response.statusText}`);
            continue;
          }
          
          const modeChords: ModeScaleChordDto[] = await response.json();
          allChords.push(...modeChords);
        } catch (error) {
          console.warn(`Error loading chords for mode ${modeEntry.name}:`, error);
        }
      }

      // Get scale notes for deduplication context
      const scaleNotes = await this.getScaleNotes(normalizedKey, mode);
      const deduplicated = this.deduplicateChordsByNoteContent(
        allChords,
        scaleNotes,
        normalizedKey
      );

      this.distinctChordsCache.set(cacheKey, deduplicated);
      return deduplicated;
    } catch (error) {
      console.error('Error loading all distinct chords from static data:', error);
      throw error;
    }
  }

  /**
   * Deduplicate chords based on chord name (root + type), preferring scale-appropriate note names
   * We want to keep all combinations of root note and chord type, but prefer better spellings
   */
  private deduplicateChordsByNoteContent(
    chords: ModeScaleChordDto[],
    scaleNotes: ScaleNoteDto[],
    keyName: string
  ): ModeScaleChordDto[] {
    // Map to track chords by their chord name (which should be unique per root+type)
    const chordsByName = new Map<string, ModeScaleChordDto[]>();

    // Group chords by their chord name
    for (const chord of chords) {
      if (!chord.chordName) continue;

      const chordName = chord.chordName;

      if (!chordsByName.has(chordName)) {
        chordsByName.set(chordName, []);
      }
      chordsByName.get(chordName)!.push(chord);
    }

    // Get scale note numbers for preference matching
    const scaleNoteNumbers = new Set(
      scaleNotes.map(note => this.noteNameToNumber(note.noteName!))
    );

    // Determine if this scale uses sharps or flats
    const scaleUsesFlats = scaleNotes.some(note => 
      note.noteName && note.noteName.includes('b')
    );
    const keyHasFlat = keyName.includes('b');
    const usesFlats = scaleUsesFlats || keyHasFlat;

    // Select the best spelling from each group (should mostly be groups of 1)
    const result: ModeScaleChordDto[] = [];

    for (const [_, chordGroup] of chordsByName) {
      if (chordGroup.length === 1) {
        result.push(chordGroup[0]);
        continue;
      }

      // If we have multiple chords with the same name (shouldn't happen in normal flow,
      // but could happen with edge cases), score each based on note spelling quality
      let bestChord = chordGroup[0];
      let bestScore = this.scoreChordNaming(chordGroup[0], scaleNoteNumbers, usesFlats);

      for (let i = 1; i < chordGroup.length; i++) {
        const score = this.scoreChordNaming(chordGroup[i], scaleNoteNumbers, usesFlats);
        if (score > bestScore) {
          bestScore = score;
          bestChord = chordGroup[i];
        }
      }

      result.push(bestChord);
    }

    return result;
  }

  /**
   * Score a chord's note naming based on scale context
   * Higher score = better match to scale conventions
   */
  private scoreChordNaming(
    chord: ModeScaleChordDto,
    scaleNoteNumbers: Set<number>,
    usesFlats: boolean
  ): number {
    if (!chord.chordNoteNames) return 0;

    let score = 0;
    const noteNames = chord.chordNoteNames.split(',').map(n => n.trim());

    for (const noteName of noteNames) {
      const noteNumber = this.noteNameToNumber(noteName);

      // +10 points if the note is in the scale
      if (scaleNoteNumbers.has(noteNumber)) {
        score += 10;
      }

      // +5 points if accidental matches scale convention (sharps vs flats)
      if (usesFlats && noteName.includes('b')) {
        score += 5;
      } else if (!usesFlats && noteName.includes('#')) {
        score += 5;
      }

      // +3 points for natural notes (no accidentals)
      if (!noteName.includes('#') && !noteName.includes('b')) {
        score += 3;
      }

      // -5 points for double sharps/flats (less readable)
      if (noteName.includes('##') || noteName.includes('bb')) {
        score -= 5;
      }
    }

    // Bonus points if the root note is in the scale
    if (chord.chordNoteName) {
      const rootNumber = this.noteNameToNumber(chord.chordNoteName);
      if (scaleNoteNumbers.has(rootNumber)) {
        score += 15;
      }
    }

    return score;
  }

  /**
   * Get generation metadata
   */
  async getMetadata(): Promise<{ generatedAt: string; modesCount: number; usingDynamicChords: boolean }> {
    if (this.useDynamicChords) {
      const modes = await this.getModes();
      return {
        generatedAt: new Date().toISOString(),
        modesCount: modes.length,
        usingDynamicChords: true
      };
    }

    const index = await this.loadIndex();
    return {
      generatedAt: index.generated_at,
      modesCount: index.modes.length,
      usingDynamicChords: false
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.indexCache = null;
    this.modesCache = null;
    this.scalesCache.clear();
    this.distinctChordsCache.clear();
  }
}

export const staticDataService = new StaticDataService();