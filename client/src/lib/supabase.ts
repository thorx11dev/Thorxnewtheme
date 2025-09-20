import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration interface
interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Cache for Supabase configuration and client
let supabaseConfigCache: SupabaseConfig | null = null;
let supabaseClientCache: SupabaseClient | null = null;

// Get Supabase configuration with automatic fallback for reconnection
async function getSupabaseConfig(): Promise<SupabaseConfig> {
  // If already cached, return immediately
  if (supabaseConfigCache) {
    return supabaseConfigCache;
  }

  // First try Vite environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    supabaseConfigCache = { url: envUrl, anonKey: envKey };
    return supabaseConfigCache;
  }
  
  // Fallback: try to fetch from backend (automatic reconnection feature)
  try {
    const response = await fetch('/api/config/supabase');
    if (response.ok) {
      const config = await response.json();
      supabaseConfigCache = config;
      console.log('Supabase config loaded from server for automatic reconnection');
      return config;
    } else {
      console.error('Failed to fetch Supabase config from server:', response.status);
    }
  } catch (error) {
    console.error('Network error while fetching Supabase config:', error);
  }
  
  throw new Error('Supabase configuration unavailable. Environment may be transitioning.');
}

// Get or create Supabase client with automatic configuration
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClientCache) {
    return supabaseClientCache;
  }

  const config = await getSupabaseConfig();
  supabaseClientCache = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  return supabaseClientCache;
}

// Create a default client that tries environment variables first
// Falls back to server config if needed
function createDefaultClient(): SupabaseClient {
  // Try environment variables first
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return createClient(envUrl, envKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  
  // If no environment variables, return a minimal client that will be replaced
  // This prevents immediate errors during app initialization
  console.warn('Supabase environment variables not available, will attempt server configuration');
  
  // Use placeholder values that won't work but won't crash the app
  return createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

// Export the default client
export const supabase = createDefaultClient();

// Function to reinitialize the client (useful for environment changes)
export async function reinitializeSupabaseClient(): Promise<SupabaseClient> {
  supabaseConfigCache = null;
  supabaseClientCache = null;
  return await getSupabaseClient();
}