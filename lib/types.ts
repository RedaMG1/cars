import { Car } from '../data/samples'

// A car row as stored in Supabase — same fields as the local Car type,
// plus the DB id and the tag used to group listings into tabs.
export type DbCar = Car & {
  id: number
  source_tag: string
}
