import { createClient } from '@supabase/supabase-js'

// Browser-safe client — uses the public "anon" key. Row Level Security on
// the `cars` table only grants this key SELECT, so the browser can read
// listings but can never insert/update/delete directly.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
