/**
 * Static Data Service
 * Handles loading data from static JSON files
 */

import type { ModeDto, ModeScaleChordDto, ScaleNoteDto } from '../api';

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
  private chordsCache: Map<string, ModeScaleChordDto[]> = new Map();
  private scalesCache: Map<string, ScalesByKey> = new Map();
  private distinctChordsCache: ModeScaleChordDto[] | null = null;

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
   * Load chords for a specific mode and key from static data
   */
  async getModeKeyChords(key: string, mode: string): Promise<ModeScaleChordDto[]> {
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

      // Check cache for the entire mode's chord data first
      if (this.chordsCache.has(modeId)) {
        const allChordsForMode = this.chordsCache.get(modeId)!;
        return allChordsForMode.filter(chord => chord.keyName === normalizedKey);
      }

      // Load chords for this mode
      const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load chords for mode ${mode}: ${response.statusText}`);
      }
      const allChords: ModeScaleChordDto[] = await response.json();
      this.chordsCache.set(modeId, allChords);

      // Filter by key
      return allChords.filter(chord => chord.keyName === normalizedKey);
    } catch (error) {
      console.error('Error loading chords from static data:', error);
      throw error;
    }
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

    try {
      console.log('Loading all distinct chords from static data...');
      
      // Get the index to find all available modes
      const index = await this.loadIndex();
      
      const allChords: ModeScaleChordDto[] = [];

      // Load chord data for each mode
      for (const mode of index.modes) {
        if (!mode.id) continue;
        
        const modeId = mode.id.toString();
        
        try {
          // Check if already cached
          if (this.chordsCache.has(modeId)) {
            allChords.push(...this.chordsCache.get(modeId)!);
          } else {
            // Load chord data for this mode
            const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
            if (!response.ok) {
              console.warn(`Failed to load chords for mode ${mode.name} (ID: ${modeId}): ${response.statusText}`);
              continue;
            }
            
            const modeChords: ModeScaleChordDto[] = await response.json();
            this.chordsCache.set(modeId, modeChords);
            allChords.push(...modeChords);
          }
        } catch (error) {
          console.warn(`Error loading chords for mode ${mode.name}:`, error);
        }
      }

      // Deduplicate chords
      this.distinctChordsCache = this.deduplicateChords(allChords);
      
      console.log(`Loaded ${allChords.length} total chords, ${this.distinctChordsCache.length} distinct chords`);
      
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
      // Create a unique key based on chord properties that define musical uniqueness
      let uniqueKey: string;
      
      uniqueKey = chord.chordName!.trim();

      // Only keep the first occurrence of each unique chord
      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, chord);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Get generation metadata
   */
  async getMetadata(): Promise<{ generatedAt: string; modesCount: number }> {
    const index = await this.loadIndex();
    return {
      generatedAt: index.generated_at,
      modesCount: index.modes.length
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.indexCache = null;
    this.modesCache = null;
    this.chordsCache.clear();
    this.scalesCache.clear();
    this.distinctChordsCache = null;
  }
}

export const staticDataService = new StaticDataService();