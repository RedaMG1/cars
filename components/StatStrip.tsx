import { Car } from '../data/samples'

function avg(nums: number[]) {
  if (!nums.length) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function StatStrip({ cars }: { cars: Car[] }) {
  if (!cars.length) return null

  const prices = cars.map((c) => c.price).filter((v): v is number => typeof v === 'number')
  const kms = cars.map((c) => c.km).filter((v): v is number => typeof v === 'number')
  const notes = cars.map((c) => c.note).filter((v): v is number => typeof v === 'number')

  const stats: [string, string][] = [
    ['Annonces', String(cars.length)],
    ['Prix moyen', avg(prices).toLocaleString('fr-FR') + ' €'],
    ['Prix le plus bas', prices.length ? Math.min(...prices).toLocaleString('fr-FR') + ' €' : '—'],
    ['Km moyen', avg(kms).toLocaleString('fr-FR') + ' km'],
    ['Notées ≥ 4/5', String(notes.filter((n) => n >= 4).length)],
  ]

  return (
    <div className="statStrip">
      {stats.map(([label, value]) => (
        <div key={label} className="stat">
          <div className="label">{label}</div>
          <div className="value">{value}</div>
        </div>
      ))}
    </div>
  )
}
