/**
 * Unified Data Service
 * Switches between API and static data based on configuration
 */

import type { ModeDto, ModeScaleChordDto, ScaleNoteDto } from '../api';
import { 
  ChordControllerService, 
  ModeControllerService, 
  ScaleControllerService 
} from '../api';
import { staticDataService } from './StaticDataService';
import { getEnvBoolean, getEnvString } from '../util/env';
import { AVAILABLE_KEYS } from '../hooks/useIntegratedAppLogic';

export interface DataServiceConfig {
  useStaticData: boolean;
  apiBaseUrl?: string;
}

class DataService {
  private config: DataServiceConfig;

  constructor() {
    // Default to static data mode - only use API if explicitly set to false
    const envStaticData = getEnvString('VITE_USE_STATIC_DATA', 'true');
    
    console.log('Initializing DataService with environment:', {
      useStaticData: envStaticData,
    });
    
    this.config = {
      useStaticData: envStaticData.toLowerCase() !== 'false', // Use static unless explicitly set to false
      apiBaseUrl: getEnvString('VITE_API_BASE_URL', 'http://localhost:8080')
    };

    console.log('DataService initialized with config:', this.config);
  }

  /**
   * Get all modes
   */
  async getModes(): Promise<ModeDto[]> {
    if (this.config.useStaticData) {
      //console.log('Loading modes from static data');
      return staticDataService.getModes();
    } else {
      //console.log('Loading modes from API');
      return ModeControllerService.getModes();
    }
  }

  /**
   * Get chords for a specific mode and key
   */
  async getModeKeyChords(key: string, mode: string): Promise<ModeScaleChordDto[]> {
    if (this.config.useStaticData) {
      //console.log(`Loading chords from static data: ${mode} in ${key}`);
      return staticDataService.getModeKeyChords(key, mode);
    } else {
      //console.log(`Loading chords from API: ${mode} in ${key}`);
      return ChordControllerService.getModeKeyChords(key, mode);
    }
  }

  /**
   * Get scale notes for a specific mode and key
   */
  async getScaleNotes(key: string, mode: string): Promise<ScaleNoteDto[]> {
    if (this.config.useStaticData) {
      //console.log(`Loading scale notes from static data: ${mode} in ${key}`);
      return staticDataService.getScaleNotes(key, mode);
    } else {
      //console.log(`Loading scale notes from API: ${mode} in ${key}`);
      return ScaleControllerService.getScaleNotes(key, mode);
    }
  }

  /**
   * Get all distinct chords across all keys and modes
   */
  async getAllDistinctChords(): Promise<ModeScaleChordDto[]> {
    if (this.config.useStaticData) {
      console.log('Loading all distinct chords from static data');
      return staticDataService.getAllDistinctChords();
    } else {
      console.log('Loading all distinct chords from API');

      const modes = await ModeControllerService.getModes();
      const allKeys = AVAILABLE_KEYS
      
      const allChords: ModeScaleChordDto[] = [];
      
      for (const mode of modes) {
        for (const key of allKeys) {
          try {
            const chords = await ChordControllerService.getModeKeyChords(key, mode.name!);
            allChords.push(...chords);
          } catch (error) {
            console.warn(`Failed to load chords for ${mode.name} in ${key}:`, error);
          }
        }
      }
      
      // Deduplicate based on chord name and notes
      return this.deduplicateChords(allChords);
    }
  }

  /**
   * Helper method to deduplicate chords
   */
  private deduplicateChords(chords: ModeScaleChordDto[]): ModeScaleChordDto[] {
    const seen = new Map<string, ModeScaleChordDto>();
    
    for (const chord of chords) {
      // Create a unique key based on chord properties that define musical uniqueness
      let uniqueKey: string;
      
      // Primary: Use chordName if available (e.g., "Cmaj7", "Am", "F#dim")
      if (chord.chordName && chord.chordName.trim() !== '') {
        uniqueKey = chord.chordName.trim();
      }
      // Secondary: Use chord note names if chord name is not available
      else if (chord.chordNoteNames && chord.chordNoteNames.trim() !== '') {
        uniqueKey = chord.chordNoteNames.trim();
      }
      // Tertiary: Combine chord type and root note
      else if (chord.chordTypeId !== undefined && chord.chordNoteName) {
        uniqueKey = `${chord.chordNoteName}_type_${chord.chordTypeId}`;
      }
      // Quaternary: Use chordNotes string representation
      else if (chord.chordNotes && chord.chordNotes.trim() !== '') {
        uniqueKey = chord.chordNotes.trim();
      }
      // Fallback: Combine available identifying properties
      else {
        const keyParts = [];
        if (chord.chordNote !== undefined) keyParts.push(`note_${chord.chordNote}`);
        if (chord.chordTypeId !== undefined) keyParts.push(`type_${chord.chordTypeId}`);
        if (chord.chordNoteName) keyParts.push(chord.chordNoteName);
        
        uniqueKey = keyParts.length > 0 ? keyParts.join('_') : JSON.stringify(chord);
      }
      
      // Only keep the first occurrence of each unique chord
      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, chord);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Get current configuration
   */
  getConfig(): DataServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (useful for runtime switching)
   */
  updateConfig(newConfig: Partial<DataServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('DataService configuration updated:', this.config);
    
    // Clear static data cache when switching modes
    if (newConfig.useStaticData !== undefined) {
      staticDataService.clearCache();
    }
  }

  /**
   * Get data source information
   */
  async getDataSourceInfo(): Promise<{
    source: 'api' | 'static';
    metadata?: any;
  }> {
    if (this.config.useStaticData) {
      try {
        const metadata = await staticDataService.getMetadata();
        return {
          source: 'static',
          metadata
        };
      } catch (error) {
        return {
          source: 'static',
          metadata: { error: 'Failed to load metadata' }
        };
      }
    } else {
      return {
        source: 'api',
        metadata: {
          baseUrl: this.config.apiBaseUrl
        }
      };
    }
  }

  /**
   * Test connection to current data source
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      if (this.config.useStaticData) {
        // Test by loading modes
        await staticDataService.getModes();
      } else {
        // Test by loading modes from API
        await ModeControllerService.getModes();
      }
      
      return {
        success: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }
}

// Export singleton instance
export const dataService = new DataService();

// Export for testing or alternative usage patterns
export { DataService };