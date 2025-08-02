/**
 * Environment utilities for safe access to Vite environment variables
 */

interface ViteEnv {
  VITE_USE_STATIC_DATA?: string;
  VITE_API_BASE_URL?: string;
  DEV?: boolean;
  PROD?: boolean;
}

/**
 * Safely get environment variables from Vite
 */
function getViteEnv(): ViteEnv {
  try {
    // Type assertion for Vite's import.meta.env
    return (import.meta as any).env || {};
  } catch (error) {
    console.warn('Failed to access import.meta.env, using fallbacks');
    return {};
  }
}

export const env = getViteEnv();

/**
 * Get boolean environment variable with fallback
 */
export function getEnvBoolean(key: keyof ViteEnv, defaultValue: boolean = false): boolean {
  const value = env[key];
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return defaultValue;
}

/**
 * Get string environment variable with fallback
 */
export function getEnvString(key: keyof ViteEnv, defaultValue: string = ''): string {
  const value = env[key];
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvBoolean('DEV', false);
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvBoolean('PROD', true);
}