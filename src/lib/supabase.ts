import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ SUPABASE CONFIG MISSING!");
  console.warn("Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to your Cloudflare/Vercel/Environment Variables.");
}

// Ensure the URL is at least an empty string to avoid crash, 
// though the app won't work until real values are provided in the dashboard.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
