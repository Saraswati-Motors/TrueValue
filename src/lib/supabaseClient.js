import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseInstance = null

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment variables. Running in Mock fallback mode.")
} else {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e.message)
  }
}

export const supabase = supabaseInstance
