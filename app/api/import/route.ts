import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { workbookToCars } from '@/lib/parseWorkbook'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Bulk-imports an .xlsx into the `cars` table, tagged source_tag: "custom"
// (or a custom tag if provided). Runs server-side only, using the Supabase
// service role key — this is the one place allowed to write to the table.
//
// Note: this endpoint has no login/auth in front of it yet. Anyone who
// knows the URL could POST to it. Fine for a personal tool with a private
// URL; add a real check here first if the site gets shared more widely.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  const tag = (form.get('tag') as string | null)?.trim() || 'custom'

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buffer, { type: 'buffer' })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Impossible de lire ce fichier : ' + (e?.message ?? String(e)) },
      { status: 400 },
    )
  }

  const parsed = workbookToCars(wb)
  if (!parsed.length) {
    return NextResponse.json({ error: 'Aucune annonce reconnue dans ce fichier.' }, { status: 400 })
  }

  let created = 0
  let skipped = 0

  for (const car of parsed) {
    if (car.guid) {
      const { data: existing } = await supabaseAdmin
        .from('cars')
        .select('id')
        .eq('guid', car.guid)
        .limit(1)
      if (existing && existing.length > 0) {
        skipped++
        continue
      }
    }

    const { error } = await supabaseAdmin.from('cars').insert({
      model: car.model,
      brand: car.brand,
      note: car.note,
      year: car.year,
      price: car.price,
      km: car.km,
      engine: car.engine,
      power: car.power,
      city: car.city,
      pros: car.pros,
      cons: car.cons,
      guid: car.guid,
      url: car.url,
      img: car.img, // filled in if the guid matched one of the pre-fetched sample cars
      source_tag: tag,
    })
    if (error) {
      return NextResponse.json({ error: 'Erreur base de données : ' + error.message }, { status: 500 })
    }
    created++
  }

  return NextResponse.json({ created, skipped, total: parsed.length })
}
