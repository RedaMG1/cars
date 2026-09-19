import * as XLSX from 'xlsx'
import { Car } from '../data/samples'
import { workbookToCars } from './parseWorkbook'

export type PickResult =
  | { status: 'error'; message: string }
  | { status: 'ok'; fileName: string; cars: Car[] }

/** Reads a File chosen via an <input type="file"> and parses it into Car rows. */
export async function parseWorkbookFile(file: File): Promise<PickResult> {
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const cars = workbookToCars(wb)
    if (!cars.length) {
      return {
        status: 'error',
        message:
          "Aucune annonce reconnue dans ce fichier. Vérifiez qu'il contient bien des colonnes comme Modèle, Prix, Kilométrage et un lien vers l'annonce.",
      }
    }
    return { status: 'ok', fileName: file.name, cars }
  } catch (e: any) {
    return { status: 'error', message: 'Impossible de lire ce fichier : ' + (e?.message ?? String(e)) }
  }
}
