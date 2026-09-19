import * as XLSX from "xlsx";
import { Car } from "../data/samples";
import { MANIFEST } from "../data/manifest";

function normHeader(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .trim();
}

type ColumnMap = Partial<
  Record<
    | "note"
    | "model"
    | "year"
    | "price"
    | "km"
    | "engine"
    | "power"
    | "city"
    | "pros"
    | "cons"
    | "url"
    | "brand",
    number
  >
>;

function guessColumns(headerRow: unknown[]): ColumnMap {
  const map: ColumnMap = {};
  headerRow.forEach((cell, i) => {
    const h = normHeader(cell);
    if (!h) return;
    if (/note/.test(h) && map.note === undefined) map.note = i;
    else if (/model/.test(h)) map.model = i;
    else if (/ann[e ]e|year/.test(h)) map.year = i;
    else if (/prix|price/.test(h)) map.price = i;
    else if (/kilom|km/.test(h)) map.km = i;
    else if (/motoris|engine|moteur/.test(h)) map.engine = i;
    else if (/puissance|power|ch\b/.test(h)) map.power = i;
    else if (/ville|city|localisation/.test(h)) map.city = i;
    else if (/fort|pro/.test(h)) map.pros = i;
    else if (/reserve|defaut|con\b/.test(h)) map.cons = i;
    else if (/lien|annonce|url|link/.test(h)) map.url = i;
    else if (/marque|brand/.test(h)) map.brand = i;
  });
  return map;
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

function toNote(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v;
  const s = String(v);
  const m = s.match(/([0-5](?:[.,]5)?)/);
  if (m) return parseFloat(m[1].replace(",", "."));
  const stars = (s.match(/★/g) || []).length;
  const half = /⯪|½/.test(s) ? 0.5 : 0;
  if (stars || half) return stars + half;
  return toNumber(v);
}

const GUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function extractGuid(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(GUID_RE);
  return m ? m[1].toLowerCase() : undefined;
}

/**
 * Parses a workbook (already loaded as an XLSX.WorkBook) into a flat list of Car rows.
 * Looks at every sheet, uses the first non-empty row as a header guess, and is forgiving
 * about column names (works across the different file styles we've generated so far).
 */
export function workbookToCars(wb: XLSX.WorkBook): Car[] {
  const cars: Car[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
    });
    if (!rows.length) continue;

    // Find the header row: first row with at least 3 non-empty cells that look like labels.
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
      if (nonEmpty.length >= 3 && nonEmpty.some((c) => /[a-zA-Z]/.test(String(c)))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const map = guessColumns(rows[headerIdx]);
    if (map.model === undefined && map.price === undefined && map.km === undefined) {
      // This sheet doesn't look like a listings table (e.g. a "Méthode" sheet). Skip it.
      continue;
    }

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

      const get = (key: keyof ColumnMap) =>
        map[key] !== undefined ? row[map[key] as number] : undefined;

      const url = get("url") != null ? String(get("url")) : undefined;
      const guid = extractGuid(url);
      const model = get("model") != null ? String(get("model")) : undefined;
      if (!model && !url) continue;

      cars.push({
        note: toNote(get("note")) ?? 0,
        model: model || "Modèle inconnu",
        year: toNumber(get("year")),
        price: toNumber(get("price")),
        km: toNumber(get("km")),
        engine: get("engine") != null ? String(get("engine")) : undefined,
        power: toNumber(get("power")),
        city: get("city") != null ? String(get("city")) : undefined,
        pros: get("pros") != null ? String(get("pros")) : undefined,
        cons: get("cons") != null ? String(get("cons")) : undefined,
        guid,
        img: guid ? MANIFEST[guid] : undefined,
        url,
        brand: get("brand") != null ? String(get("brand")) : undefined,
      });
    }
  }

  return cars;
}
