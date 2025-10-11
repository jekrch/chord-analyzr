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
  private distinctChordsCache: ModeScaleChordDto[] | null = null;
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
    this.distinctChordsCache = null;
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
      console.error('Error loading modes from static data:', error);
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
   * Get all distinct chords across all keys and modes
   */
  async getAllDistinctChords(): Promise<ModeScaleChordDto[]> {
    // Return cached result if available
    if (this.distinctChordsCache) {
      return this.distinctChordsCache;
    }

    if (this.useDynamicChords) {
      try {
        // Generate distinct chords dynamically across all modes and common keys
        const modes = await this.getModes();
        const commonKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'F#', 'Bb', 'Eb', 'Ab', 'Db'];
        const allChords: ModeScaleChordDto[] = [];

        for (const mode of modes) {
          for (const key of commonKeys) {
            try {
              const chords = await dynamicChordGenerator.generateChordsForScale(key, mode.name!, true);
              allChords.push(...chords.map(chord => ({
                keyName: chord.keyName,
                modeId: chord.modeId,
                chordNote: chord.chordNote,
                chordNoteName: chord.chordNoteName,
                chordName: chord.chordName,
                chordNotes: chord.chordNotes,
                chordNoteNames: chord.chordNoteNames
              })));
            } catch (error) {
              console.warn(`Error generating chords for ${key} ${mode.name}:`, error);
            }
          }
        }

        this.distinctChordsCache = this.deduplicateChords(allChords);
        return this.distinctChordsCache;
      } catch (error) {
        console.warn('Dynamic distinct chord generation failed, falling back to static data:', error);
      }
    }

    // Static data fallback
    try {
      const index = await this.loadIndex();
      const allChords: ModeScaleChordDto[] = [];

      // Load chord data for each mode
      for (const mode of index.modes) {
        if (!mode.id) continue;
        
        const modeId = mode.id.toString();
        
        try {
          const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
          if (!response.ok) {
            console.warn(`Failed to load chords for mode ${mode.name} (ID: ${modeId}): ${response.statusText}`);
            continue;
          }
          
          const modeChords: ModeScaleChordDto[] = await response.json();
          allChords.push(...modeChords);
        } catch (error) {
          console.warn(`Error loading chords for mode ${mode.name}:`, error);
        }
      }

      // Deduplicate chords
      this.distinctChordsCache = this.deduplicateChords(allChords);
      return this.distinctChordsCache;
    } catch (error) {
      console.error('Error loading all distinct chords from static data:', error);
      throw error;
    }
  }

  /**
 * Helper method to deduplicate chords based on their musical properties
 */
private deduplicateChords(chords: ModeScaleChordDto[]): ModeScaleChordDto[] {
  const seen = new Map<string, ModeScaleChordDto>();
  
  for (const chord of chords) {
    // Create a unique key based on the actual notes in the chord
    let uniqueKey: string;
    
      // Fallback to chordNotes if chordNoteNames isn't available
      // Assuming chordNotes is also a comma-separated string or similar
      const notes = chord.chordNotes!
        .split(',')
        .map(note => note.trim())
        .filter(note => note.length > 0)
        .sort();
      
      uniqueKey = chord.chordName + notes.join(',');

    // Only keep the first occurrence of each unique chord
    // This will prefer chords that appear earlier in the list
    if (uniqueKey && !seen.has(uniqueKey)) {
      seen.set(uniqueKey, chord);
    }
  }
  
  return Array.from(seen.values());
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
    this.distinctChordsCache = null;
  }
}

export const staticDataService = new StaticDataService();