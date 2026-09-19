// One-time migration: pushes the 45 sample cars (Mercedes / Audi / Audi
// fiables), already bundled in data/samples.ts with their real photos, into
// the Supabase `cars` table.
//
// Run once, after .env.local has NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY set:
//   npx tsx scripts/seed.ts
//
// Safe to re-run: fetches existing guids once, then bulk-inserts only the
// cars not already present (fast — a couple of requests, not one per car).

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { SAMPLES } from '../data/samples'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function run() {
  const { data: existingRows, error: fetchErr } = await supabaseAdmin
    .from('cars')
    .select('guid')
  if (fetchErr) {
    console.error('Failed to fetch existing guids:', fetchErr.message)
    process.exit(1)
  }
  const existing = new Set((existingRows ?? []).map((r) => r.guid).filter(Boolean))
  console.log(`Existing rows: ${existing.size}`)

  const toInsert: any[] = []
  for (const [tag, cars] of Object.entries(SAMPLES)) {
    for (const car of cars) {
      if (car.guid && existing.has(car.guid)) continue
      toInsert.push({
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
        img: car.img,
        source_tag: tag,
      })
    }
  }

  console.log(`To insert: ${toInsert.length}`)
  if (toInsert.length === 0) {
    console.log('Nothing to do — already up to date.')
    return
  }

  const { data, error } = await supabaseAdmin.from('cars').insert(toInsert).select('model')
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
  console.log(`Inserted ${data?.length ?? 0} rows.`)
}

run()
