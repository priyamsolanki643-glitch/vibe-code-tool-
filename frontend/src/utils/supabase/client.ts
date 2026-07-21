import { createClient } from '@supabase/supabase-js'

// Automatically clean up the Vercel injected URL if it contains /rest/v1/
let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kscqvigvcfjdulonvdxa.supabase.co';
if (rawUrl.includes('/rest/v1')) {
  rawUrl = rawUrl.replace('/rest/v1/', '').replace('/rest/v1', '');
}
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key_for_build';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
