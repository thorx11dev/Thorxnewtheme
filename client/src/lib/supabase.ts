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

// Create a default client using environment variables
function createDefaultClient(): SupabaseClient {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!envUrl || !envKey) {
    console.error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.error('Please configure these secrets in the Replit environment to enable authentication.');
    // Create a dummy client with placeholder values to prevent crashes
    // This allows the app to load, but auth features will not work
    return createClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );
  }
  
  console.log('Initializing Supabase client with environment variables');
  return createClient(envUrl, envKey, {
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