// Zjišťování silniční vzdálenosti mezi místy přes Mapy.cz REST API
// (https://developer.mapy.cz). Vyžaduje API klíč v Nastavení; výsledky
// se kešují v localStorage, takže opakované trasy se znovu nedotazují.

interface Coordinates {
  lon: number;
  lat: number;
}

const CACHE_KEY = "kniha-jizd-route-cache";

let routeCache: Record<string, number> | null = null;

const normalizePlace = (place: string) => place.trim().toLowerCase().replace(/\s+/g, " ");

export const routeCacheKey = (from: string, to: string) => `${normalizePlace(from)}|${normalizePlace(to)}`;

function loadCache(): Record<string, number> {
  if (routeCache) return routeCache;
  routeCache = {};
  try {
    if (typeof localStorage !== "undefined") {
      const stored: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
      if (typeof stored === "object" && stored !== null && !Array.isArray(stored)) {
        routeCache = Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === "number"));
      }
    }
  } catch {
    routeCache = {};
  }
  return routeCache;
}

function saveCache() {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(routeCache ?? {}));
  } catch {
    // localStorage může být nedostupné (soukromé okno) — keš je jen optimalizace.
  }
}

export function clearRouteCache() {
  routeCache = {};
  saveCache();
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Mapy.cz se nepodařilo kontaktovat. Zkontrolujte připojení k internetu.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("Mapy.cz odmítly API klíč. Zkontrolujte ho v Nastavení.");
  }
  if (!response.ok) throw new Error(`Mapy.cz vrátily chybu (${response.status}).`);
  return response.json();
}

export async function geocodePlace(query: string, apiKey: string): Promise<Coordinates> {
  const url = `https://api.mapy.cz/v1/geocode?query=${encodeURIComponent(query)}&limit=1&lang=cs&apikey=${encodeURIComponent(apiKey)}`;
  const result = (await fetchJson(url)) as { items?: Array<{ position?: { lon?: unknown; lat?: unknown } }> };
  const position = result.items?.[0]?.position;
  if (!position || typeof position.lon !== "number" || typeof position.lat !== "number") {
    throw new Error(`Místo "${query}" se nepodařilo najít na mapě.`);
  }
  return { lon: position.lon, lat: position.lat };
}

export async function getRouteKm(from: string, to: string, apiKey: string): Promise<number> {
  if (!from.trim() || !to.trim()) throw new Error("Vyplňte místo odjezdu i příjezdu.");
  const cache = loadCache();
  const key = routeCacheKey(from, to);
  const cached = cache[key];
  if (cached) return cached;

  const [start, end] = await Promise.all([geocodePlace(from, apiKey), geocodePlace(to, apiKey)]);
  const url =
    `https://api.mapy.cz/v1/routing/route?start=${start.lon},${start.lat}&end=${end.lon},${end.lat}` +
    `&routeType=car_fast&apikey=${encodeURIComponent(apiKey)}`;
  const result = (await fetchJson(url)) as { length?: unknown };
  if (typeof result.length !== "number" || result.length <= 0) {
    throw new Error(`Trasu ${from} – ${to} se nepodařilo naplánovat.`);
  }
  const km = Math.max(1, Math.round(result.length / 1000));
  cache[key] = km;
  saveCache();
  return km;
}
