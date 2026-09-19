import { Car } from '../data/samples'

const STORAGE_KEY = 'garage_favorites_v1'

export function carKey(car: Car): string {
  return car.guid || car.url || car.model
}

type FavoritesMap = Record<string, Car>;

function readMap(): FavoritesMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: FavoritesMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // best-effort
  }
}

/** Loads all favorited cars, most-recently-favorited first. Browser-only. */
export function loadFavorites(): Car[] {
  const map = readMap()
  return Object.values(map).reverse()
}

/** Adds or removes a car from favorites and returns the updated list. */
export function toggleFavorite(car: Car): Car[] {
  const map = readMap()
  const key = carKey(car)
  if (map[key]) {
    delete map[key]
  } else {
    map[key] = car
  }
  writeMap(map)
  return Object.values(map).reverse()
}
