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
  bmw: 'BMW',
  a5: 'Audi A5',
  custom: 'Importées',
}

// Groups a car's free-text model string into a short model-line label
// (e.g. "A3 Cabriolet", "Classe C") so listings within a brand can be
// filtered by model, not just by brand.
function modelFamily(car: DbCar): string {
  const model = car.model ?? ''

  if (car.brand === 'Audi') {
    const code =
      model.match(/\bA\d\b/)?.[0] ??
      model.match(/\b\d{2,3}\b/)?.[0] ??
      model.replace(/^Audi\s*/i, '').split(' ')[0] ??
      'Autre'
    if (/cabriolet/i.test(model)) return `${code} Cabriolet`
    if (/sportback/i.test(model)) return `${code} Sportback`
    return code
  }

  if (car.brand === 'Mercedes-Benz') {
    const letter = model.match(/Mercedes-Benz\s+([A-Z])\s?\d/)?.[1] ?? model.match(/\b[A-Z]\b/)?.[0]
    return letter ? `Classe ${letter}` : 'Autre'
  }

  const rest = car.brand ? model.replace(new RegExp(`^${car.brand}\\s*`, 'i'), '') : model
  return rest.split(' ')[0] || model || 'Autre'
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
  const [modelFilter, setModelFilter] = useState<string>('all')
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

  const carsInTab = useMemo(() => {
    return tab === 'favorites'
      ? cars.filter((c) => favoriteKeys.has(carKey(c)))
      : tab === 'all'
        ? cars
        : cars.filter((c) => c.source_tag === tab)
  }, [cars, tab, favoriteKeys])

  const models = useMemo(() => {
    if (tab === 'all' || tab === 'favorites') return []
    const counts = new Map<string, number>()
    for (const c of carsInTab) {
      const key = modelFamily(c)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }))
  }, [carsInTab, tab])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let data =
      modelFilter === 'all' ? carsInTab : carsInTab.filter((c) => modelFamily(c) === modelFilter)

    if (q) {
      data = data.filter((c) =>
        `${c.model ?? ''} ${c.city ?? ''} ${c.brand ?? ''}`.toLowerCase().includes(q),
      )
    }
    return [...data].sort(SORTERS[sort])
  }, [carsInTab, modelFilter, search, sort])

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

  const selectTab = (key: string) => {
    setTab(key)
    setModelFilter('all')
  }

  const onToggleFavorite = (car: Car) => {
    const updated = toggleFavorite(car)
    setFavoriteKeys(new Set(updated.map(carKey)))
  }

  const onDeleteCar = async (id: number, code: string) => {
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Erreur inconnue lors de la suppression.')
    }
    setCars((prev) => prev.filter((c) => c.id !== id))
  }

  const onToggleReject = async (id: number, rejected: boolean) => {
    const res = await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rejected }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Erreur inconnue.')
    }
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, rejected } : c)))
  }

  const retagCategory = async (from: string, to: string) => {
    const res = await fetch('/api/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Erreur inconnue.')
    }
    setCars((prev) => prev.map((c) => (c.source_tag === from ? { ...c, source_tag: to } : c)))
    if (tab === from) setTab(to)
  }

  const onRenameCategory = async (t: { key: string; label: string; count: number }) => {
    const input = window.prompt(`Nouveau nom pour la catégorie « ${t.label} » :`, t.label)
    if (input === null) return
    const newName = input.trim()
    if (!newName || newName === t.key) return
    try {
      await retagCategory(t.key, newName)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors du renommage.')
    }
  }

  const onMergeCategory = async (t: { key: string; label: string; count: number }) => {
    const others = tabs.filter((o) => o.key !== t.key)
    if (others.length === 0) {
      window.alert("Il n'y a aucune autre catégorie dans laquelle fusionner.")
      return
    }
    const choices = others.map((o) => o.label).join(', ')
    const input = window.prompt(
      `Fusionner « ${t.label} » dans quelle catégorie ? Tapez exactement l'un de : ${choices}`,
    )
    if (input === null) return
    const typed = input.trim().toLowerCase()
    const target = others.find(
      (o) => o.label.toLowerCase() === typed || o.key.toLowerCase() === typed,
    )
    if (!target) {
      window.alert("Catégorie inconnue — copiez exactement l'un des noms proposés.")
      return
    }
    if (
      !window.confirm(
        `Déplacer les ${t.count} annonce(s) de « ${t.label} » vers « ${target.label} » ?`,
      )
    ) {
      return
    }
    try {
      await retagCategory(t.key, target.key)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors de la fusion.')
    }
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
              onClick={() => selectTab('all')}
            >
              Toutes ({cars.length})
            </button>
            {tabs.map((t) => (
              <div key={t.key} className="tabGroup">
                <button
                  type="button"
                  className={`tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => selectTab(t.key)}
                >
                  {t.label} ({t.count})
                </button>
                <button
                  type="button"
                  className="tabAction"
                  onClick={() => onRenameCategory(t)}
                  title="Renommer cette catégorie"
                  aria-label="Renommer cette catégorie"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="tabAction"
                  onClick={() => onMergeCategory(t)}
                  title="Fusionner dans une autre catégorie"
                  aria-label="Fusionner dans une autre catégorie"
                >
                  ⇄
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`tab${tab === 'favorites' ? ' active' : ''}`}
              onClick={() => selectTab('favorites')}
            >
              ♥ Favoris ({favoriteKeys.size})
            </button>
          </div>

          {tab !== 'all' && tab !== 'favorites' && models.length > 1 && (
            <div className="modelRow">
              <button
                type="button"
                className={`modelChip${modelFilter === 'all' ? ' active' : ''}`}
                onClick={() => setModelFilter('all')}
              >
                Tous les modèles ({carsInTab.length})
              </button>
              {models.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`modelChip${modelFilter === m.key ? ' active' : ''}`}
                  onClick={() => setModelFilter(m.key)}
                >
                  {m.key} ({m.count})
                </button>
              ))}
            </div>
          )}

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
                  onDelete={onDeleteCar}
                  onToggleReject={onToggleReject}
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
