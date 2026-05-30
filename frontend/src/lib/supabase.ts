import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}
export const supabase = createClient(supabaseUrl, supabaseKey);

export const BACKEND_URL = 'http://localhost:8080'

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
