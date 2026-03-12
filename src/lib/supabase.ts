import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyvomjxqlccvvtgyvsxr.supabase.co';
const supabaseAnonKey = 'sb_publishable_RZFE6NXGUWKRlJo7-VQg5g_FEojwieR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
