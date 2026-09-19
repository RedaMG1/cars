import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY: uses the service role key, which bypasses Row Level
// Security entirely. Never import this file from a component marked
// 'use client' or from any code that ships to the browser — only from
// Next.js Route Handlers (app/api/**/route.ts) and standalone scripts.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
