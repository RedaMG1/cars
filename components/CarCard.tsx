'use client'

import { useState } from 'react'
import { Car } from '../data/samples'
import { DbCar } from '../lib/types'

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
  onDelete,
  onToggleReject,
}: {
  car: DbCar
  isFavorite: boolean
  onToggleFavorite: (car: Car) => void
  onDelete: (id: number, code: string) => Promise<void>
  onToggleReject: (id: number, rejected: boolean) => Promise<void>
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const priceStr = car.price != null ? fmtNum(car.price) + ' €' : '—'
  const kmStr = car.km != null ? fmtNum(car.km) + ' km' : '—'

  const handleDelete = async () => {
    const code = window.prompt('Code de suppression :')
    if (code === null) return
    setDeleting(true)
    try {
      await onDelete(car.id, code)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleReject = async () => {
    setRejecting(true)
    try {
      await onToggleReject(car.id, !car.rejected)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="card">
      <div className={`photoWrap${car.rejected ? ' rejected' : ''}`}>
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

        {car.rejected && (
          <svg className="rejectOverlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="3" y1="3" x2="97" y2="97" stroke="#ff3b3b" strokeWidth="4" strokeLinecap="round" />
            <line x1="97" y1="3" x2="3" y2="97" stroke="#ff3b3b" strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}

        <button
          type="button"
          className={`favoriteBtn${isFavorite ? ' active' : ''}`}
          onClick={() => onToggleFavorite(car)}
          aria-label="Favori"
        >
          {isFavorite ? '♥' : '♡'}
        </button>

        <button
          type="button"
          className={`rejectBtn${car.rejected ? ' active' : ''}`}
          onClick={handleToggleReject}
          disabled={rejecting}
          aria-label={car.rejected ? 'Annuler le rejet' : 'Marquer comme rejetée'}
          title={car.rejected ? 'Annuler le rejet' : 'Marquer cette annonce comme rejetée'}
        >
          {rejecting ? '…' : '✕'}
        </button>

        <button
          type="button"
          className="deleteBtn"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Supprimer"
          title="Supprimer cette annonce"
        >
          {deleting ? '…' : '🗑'}
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
