'use client'

import { useState } from 'react'
import { Car } from '../data/samples'

function fmtNum(n?: number) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR')
}

function starString(note?: number) {
  if (note == null || isNaN(note)) return '—'
  const full = Math.floor(note)
  const half = note - full >= 0.5 ? 1 : 0
  const empty = Math.max(0, 5 - full - half)
  return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(empty)
}

export function CarCard({
  car,
  isFavorite,
  onToggleFavorite,
}: {
  car: Car
  isFavorite: boolean
  onToggleFavorite: (car: Car) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const priceStr = car.price != null ? fmtNum(car.price) + ' €' : '—'
  const kmStr = car.km != null ? fmtNum(car.km) + ' km' : '—'

  return (
    <div className="card">
      <div className="photoWrap">
        {car.img && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={car.img}
            alt={car.model}
            className="photo"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="photoFallback">
            <div className="icon">🚘</div>
            <div className="msg">
              {car.img === undefined
                ? 'Annonce non reconnue dans le cache — le lien reste valide'
                : 'Photo indisponible'}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`favoriteBtn${isFavorite ? ' active' : ''}`}
          onClick={() => onToggleFavorite(car)}
          aria-label="Favori"
        >
          {isFavorite ? '♥' : '♡'}
        </button>

        <div className="noteBadge">
          <span className="noteStars">{starString(car.note)}</span>
          <span className="noteValue">{car.note != null ? car.note.toFixed(1) : '—'}</span>
        </div>

        <div className="plate">
          <div className="plateBand" />
          <div className="plateAmount">
            <span>{priceStr}</span>
          </div>
        </div>
      </div>

      <div className="body">
        {car.brand && <div className="brand">{car.brand.toUpperCase()}</div>}
        <h3 className="carTitle">{car.model}</h3>

        <div className="chipsRow">
          {car.year && <span className="chip">📅 {car.year}</span>}
          <span className="chip">🛣️ {kmStr}</span>
          {car.power && <span className="chip">💪 {car.power} ch</span>}
        </div>
        {car.engine && <div className="chipMuted">⚙️ {car.engine}</div>}
        {car.city && <div className="chipMuted">📍 {car.city}</div>}

        {car.pros && (
          <div className="kvLine">
            <span className="kvIcon" style={{ color: 'var(--good)' }}>✓</span>
            <span className="kvText">{car.pros}</span>
          </div>
        )}
        {car.cons && (
          <div className="kvLine">
            <span className="kvIcon" style={{ color: 'var(--caution)' }}>⚠</span>
            <span className="kvText">{car.cons}</span>
          </div>
        )}

        {car.url && (
          <a className="cta" href={car.url} target="_blank" rel="noopener noreferrer">
            Voir l'annonce ↗
          </a>
        )}
      </div>
    </div>
  )
}
