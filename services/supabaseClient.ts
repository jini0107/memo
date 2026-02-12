
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are missing!");
}

let client;
try {
    client = createClient(supabaseUrl, supabaseKey);
} catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    // Create a dummy client to prevent crashes on import
    client = {
        from: () => ({
            select: () => ({ order: () => Promise.resolve({ data: [], error: { message: 'Supabase client failed to initialize' } }) }),
            insert: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }),
            update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }) }),
            delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }) }),
        })
    } as any;
}

export const supabase = client;
