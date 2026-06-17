import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

// Global flag to track if we should bypass Supabase (e.g. if we get 403 Forbidden on anon queries)
if (typeof window !== 'undefined' && !window.hasOwnProperty('supabaseIsForbidden')) {
  window.supabaseIsForbidden = sessionStorage.getItem("tv_supabase_forbidden") === "true";
}

export const setSupabaseForbidden = (val) => {
  if (typeof window !== 'undefined') {
    window.supabaseIsForbidden = val;
    if (val) {
      sessionStorage.setItem("tv_supabase_forbidden", "true");
    } else {
      sessionStorage.removeItem("tv_supabase_forbidden");
    }
  }
};

export const isSupabaseMockActive = () => {
  return !supabaseInstance || (typeof window !== 'undefined' && window.supabaseIsForbidden);
};

export const supabase = supabaseInstance
