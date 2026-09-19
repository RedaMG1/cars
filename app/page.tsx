'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CarCard } from '@/components/CarCard'
import { StatStrip } from '@/components/StatStrip'
import { Car } from '@/data/samples'
import { carKey, loadFavorites, toggleFavorite } from '@/lib/favorites'
import { supabase } from '@/lib/supabaseClient'
import { DbCar } from '@/lib/types'

type SortKey = 'note_desc' | 'price_asc' | 'price_desc' | 'km_asc' | 'year_desc'

const KNOWN_TAGS: Record<string, string> = {
  mercedes: 'Mercedes',
  audi: 'Audi',
  audi2: 'Audi fiables',
  custom: 'Importées',
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'note_desc', label: 'Meilleure note' },
  { key: 'price_asc', label: 'Prix ↑' },
  { key: 'price_desc', label: 'Prix ↓' },
  { key: 'km_asc', label: 'Km ↑' },
  { key: 'year_desc', label: 'Plus récent' },
]

const SORTERS: Record<SortKey, (a: DbCar, b: DbCar) => number> = {
  note_desc: (a, b) => (b.note ?? 0) - (a.note ?? 0),
  price_asc: (a, b) => (a.price ?? 1e9) - (b.price ?? 1e9),
  price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
  km_asc: (a, b) => (a.km ?? 1e9) - (b.km ?? 1e9),
  year_desc: (a, b) => (b.year ?? 0) - (a.year ?? 0),
}

export default function Home() {
  const [cars, setCars] = useState<DbCar[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [tab, setTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('note_desc')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set())
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refetch = async () => {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('note', { ascending: false })
    if (error) {
      setLoadState('error')
      setError(error.message)
      return
    }
    setCars((data ?? []) as DbCar[])
    setLoadState('ok')
  }

  useEffect(() => {
    refetch()
    setFavoriteKeys(new Set(loadFavorites().map(carKey)))
    setFavoritesLoaded(true)
  }, [])

  const tabs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of cars) counts.set(c.source_tag, (counts.get(c.source_tag) ?? 0) + 1)
    const known = Object.keys(KNOWN_TAGS).filter((k) => counts.has(k))
    const other = [...counts.keys()].filter((k) => !KNOWN_TAGS[k])
    return [...known, ...other].map((key) => ({
      key,
      label: KNOWN_TAGS[key] ?? key,
      count: counts.get(key) ?? 0,
    }))
  }, [cars])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let data =
      tab === 'favorites'
        ? cars.filter((c) => favoriteKeys.has(carKey(c)))
        : tab === 'all'
          ? cars
          : cars.filter((c) => c.source_tag === tab)

    if (q) {
      data = data.filter((c) =>
        `${c.model ?? ''} ${c.city ?? ''} ${c.brand ?? ''}`.toLowerCase().includes(q),
      )
    }
    return [...data].sort(SORTERS[sort])
  }, [cars, tab, search, sort, favoriteKeys])

  const onFileChosen = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue lors de l'import.")
      } else {
        await refetch()
        setTab('custom')
      }
    } catch (e: any) {
      setError('Erreur : ' + (e?.message ?? String(e)))
    } finally {
      setUploading(false)
    }
  }

  const onToggleFavorite = (car: Car) => {
    const updated = toggleFavorite(car)
    setFavoriteKeys(new Set(updated.map(carKey)))
  }

  return (
    <div className="page">
      <div className="header">
        <div className="mark">🚘</div>
        <div>
          <h1 className="title">Garage des Annonces</h1>
          <p className="subtitle">Vos annonces, enregistrées en ligne</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileChosen(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="uploadBtn"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Import en cours…' : 'Importer un fichier .xlsx'}
      </button>

      {error && <p className="errorText">{error}</p>}

      {loadState === 'error' && (
        <div className="empty">
          Impossible de charger les annonces depuis la base. Vérifiez que les variables
          d'environnement Supabase sont bien configurées.
        </div>
      )}

      {loadState === 'loading' && <div className="empty">Chargement…</div>}

      {loadState === 'ok' && (
        <>
          <div className="tabsRow">
            <button
              type="button"
              className={`tab${tab === 'all' ? ' active' : ''}`}
              onClick={() => setTab('all')}
            >
              Toutes ({cars.length})
            </button>
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label} ({t.count})
              </button>
            ))}
            <button
              type="button"
              className={`tab${tab === 'favorites' ? ' active' : ''}`}
              onClick={() => setTab('favorites')}
            >
              ♥ Favoris ({favoriteKeys.size})
            </button>
          </div>

          <StatStrip cars={filtered} />

          <input
            className="search"
            placeholder="Filtrer par modèle ou ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="sortRow">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`sortChip${sort === o.key ? ' active' : ''}`}
                onClick={() => setSort(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              {tab === 'favorites' && favoritesLoaded
                ? "Aucun favori pour l'instant — cliquez sur ♡ sur une annonce pour l'ajouter."
                : cars.length === 0
                  ? "Aucune annonce en base pour l'instant — importez un fichier .xlsx, ou lancez le script scripts/seed.ts pour charger les 45 annonces d'exemple."
                  : 'Aucune annonce ne correspond à ce filtre.'}
            </div>
          ) : (
            <div className="grid">
              {filtered.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isFavorite={favoriteKeys.has(carKey(car))}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      <p className="footnote">
        Les photos et prix affichés proviennent des annonces d'origine au moment de leur import ;
        ils peuvent avoir changé depuis. Le lien vers l'annonce reste toujours cliquable. Vos
        favoris sont enregistrés sur cet appareil ; les annonces elles-mêmes sont enregistrées en
        ligne et visibles depuis n'importe quel appareil.
      </p>
    </div>
  )
}
