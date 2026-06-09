import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'supabase-auth',
  },
});

// Re-export BACKEND_URL for convenience
const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
export const BACKEND_URL = backendUrl != null ? backendUrl.trim().replace(/\/$/, '') : '';

// Re-export UserProfile type
export interface UserProfile {
    id: string
    email: string
    name: string
    plan: string
    phone: string | null
    theme: string
    language: string
    created_at: string
    updated_at: string | null
    premium_expires_at: string | null
}