/**
 * Load environment variables from .env.local
 * Use this before running test scripts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

export function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        // Don't override existing env vars
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    console.log('[ENV] Loaded environment variables from .env.local');
    return true;
  } catch (error) {
    console.error('[ENV] Failed to load .env.local:', (error as Error).message);
    return false;
  }
}

// Auto-load when imported
loadEnv();
