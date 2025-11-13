import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Handle build-time environment variable issues
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV;
const hasValidEnvVars = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined';

if (!hasValidEnvVars && !isBuildTime) {
  console.warn('⚠️ Supabase environment variables not found');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
); 