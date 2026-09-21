import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Deletes one car by id, gated by a short PIN so a stray click (or someone
// who finds the URL) can't wipe a listing by accident. Not real auth —
// matches the "personal tool, private URL" security level of /api/import.
// Runs server-side only, using the Supabase service role key.
const DELETE_CODE = '0624'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  const code = body?.code

  if (typeof id !== 'number') {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }
  if (code !== DELETE_CODE) {
    return NextResponse.json({ error: 'Code incorrect.' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('cars').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Erreur base de données : ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
