import { supabase } from './supabase'

export async function getAuthHeadersAsync(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  } catch {}
  return {}
}


