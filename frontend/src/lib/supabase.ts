import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}
export const supabase = createClient(supabaseUrl, supabaseKey);


export interface UserProfile {
    id: string
    email: string
    name: string
    plan: string
    phone: string | null
    created_at: string
}
