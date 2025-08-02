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
      console.log('Loading modes from static data');
      return staticDataService.getModes();
    } else {
      console.log('Loading modes from API');
      return ModeControllerService.getModes();
    }
  }

  /**
   * Get chords for a specific mode and key
   */
  async getModeKeyChords(key: string, mode: string): Promise<ModeScaleChordDto[]> {
    if (this.config.useStaticData) {
      console.log(`Loading chords from static data: ${mode} in ${key}`);
      return staticDataService.getModeKeyChords(key, mode);
    } else {
      console.log(`Loading chords from API: ${mode} in ${key}`);
      return ChordControllerService.getModeKeyChords(key, mode);
    }
  }

  /**
   * Get scale notes for a specific mode and key
   */
  async getScaleNotes(key: string, mode: string): Promise<ScaleNoteDto[]> {
    if (this.config.useStaticData) {
      console.log(`Loading scale notes from static data: ${mode} in ${key}`);
      return staticDataService.getScaleNotes(key, mode);
    } else {
      console.log(`Loading scale notes from API: ${mode} in ${key}`);
      return ScaleControllerService.getScaleNotes(key, mode);
    }
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