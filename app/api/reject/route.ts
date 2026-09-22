import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Toggles the "rejected" mark on a car (shown as a red cross over its
// photo). Reversible and non-destructive, so unlike /api/delete this
// needs no confirmation code.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  const rejected = body?.rejected

  if (typeof id !== 'number') {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  }
  if (typeof rejected !== 'boolean') {
    return NextResponse.json({ error: 'Valeur invalide.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('cars').update({ rejected }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Erreur base de données : ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
