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
  private baseUrl = '/data';
  private indexCache: StaticDataIndex | null = null;
  private modesCache: ModeDto[] | null = null;
  private chordsCache: Map<string, ModeScaleChordDto[]> = new Map();
  private scalesCache: Map<string, ScalesByKey> = new Map();

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
      key = key.toUpperCase().trim();
      // First, get the index to find available modes
      const index = await this.loadIndex();
      
      // Find the mode ID for the given mode name
      const modeData = index.modes.find(m => m.name === mode);
      
      if (!modeData || !modeData.id) {
        throw new Error(`Mode "${mode}" not found`);
      }

      const modeId = modeData.id.toString();
      const cacheKey = `${modeId}-${key}`;

      // Check cache first
      if (this.chordsCache.has(cacheKey)) {
        const cached = this.chordsCache.get(cacheKey)!;
        return cached.filter(chord => chord.keyName === key);
      }

      // Load chords for this mode
      const response = await fetch(`${this.baseUrl}/chords-mode-${modeId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load chords for mode ${mode}: ${response.statusText}`);
      }
      const allChords: ModeScaleChordDto[] = await response.json();
      this.chordsCache.set(modeId, allChords);

      // Filter by key
      return allChords.filter(chord => chord.keyName === key);
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
        return cached[key] || [];
      }

      // Load scales for this mode
      const response = await fetch(`${this.baseUrl}/scales-mode-${modeId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load scales for mode ${mode}: ${response.statusText}`);
      }
      
      const scalesByKey: ScalesByKey = await response.json();
      this.scalesCache.set(modeId, scalesByKey);

      return scalesByKey[key] || [];
    } catch (error) {
      console.error('Error loading scale notes from static data:', error);
      throw error;
    }
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
  }
}

export const staticDataService = new StaticDataService();