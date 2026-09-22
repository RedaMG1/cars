import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Renames a category (source_tag) or merges it into another one. Both are
// the same operation — reassign every car whose source_tag is `from` to
// `to` — the frontend just decides whether `to` is freshly typed (rename)
// or an existing tag's key (merge). Runs server-side with the service
// role key, same pattern as /api/import and /api/delete.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const from = (body?.from as string | undefined)?.trim()
  const to = (body?.to as string | undefined)?.trim()

  if (!from || !to) {
    return NextResponse.json({ error: 'Nom de catégorie manquant.' }, { status: 400 })
  }
  if (from === to) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  const { data, error } = await supabaseAdmin
    .from('cars')
    .update({ source_tag: to })
    .eq('source_tag', from)
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Erreur base de données : ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0 })
}
