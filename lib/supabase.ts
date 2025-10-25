import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // During build time, environment variables might not be available
  // Return a mock client to prevent build failures
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build time
    console.warn("Supabase environment variables not found. Using mock client for build.")
    return null as any
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function getSupabase() {
  return createClient()
}
