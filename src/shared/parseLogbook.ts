import type { Driver, FuelRecord, LogbookData, Place, Trip, Vehicle } from "./types.js";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const defaultSettings = (): LogbookData["settings"] => ({
  highKmPerDayThreshold: 800,
  autoBackup: true,
  theme: "light"
});

export const emptyLogbook = (): LogbookData => ({
  version: 1,
  vehicles: [],
  drivers: [],
  places: [],
  trips: [],
  fuels: [],
  settings: defaultSettings()
});

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : value === null || value === undefined ? fallback : String(value));
const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function records(value: unknown, label: string): Record<string, unknown>[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`Neplatná kniha jízd: pole "${label}" musí být seznam.`);
  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`Neplatná kniha jízd: záznam ${label}[${index}] není objekt.`);
    }
    return item as Record<string, unknown>;
  });
}

/**
 * Zvaliduje a znormalizuje JSON knihy jízd z neznámého zdroje.
 * Chybějící pole doplní výchozími hodnotami, řidiče a místa odvodí
 * z jízd; na strukturálně nevalidní vstup vyhodí chybu s českou hláškou.
 */
export function parseLogbookData(input: unknown): LogbookData {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Neplatná kniha jízd: očekává se JSON objekt.");
  }
  const raw = input as Record<string, unknown>;

  const vehicles: Vehicle[] = records(raw.vehicles, "vehicles").map((item) => ({
    id: str(item.id) || createId(),
    spz: str(item.spz),
    brand: str(item.brand),
    model: str(item.model),
    year: num(item.year, new Date().getFullYear()),
    fuel: str(item.fuel),
    initialOdometer: num(item.initialOdometer),
    note: str(item.note)
  }));

  const trips: Trip[] = records(raw.trips, "trips").map((item) => ({
    id: str(item.id) || createId(),
    date: str(item.date),
    departureTime: str(item.departureTime),
    arrivalTime: str(item.arrivalTime),
    vehicleId: str(item.vehicleId),
    driver: str(item.driver),
    from: str(item.from),
    to: str(item.to),
    purpose: str(item.purpose),
    type: item.type === "soukromá" ? "soukromá" : "služební",
    odometerStart: num(item.odometerStart),
    odometerEnd: num(item.odometerEnd),
    note: str(item.note)
  }));

  const fuels: FuelRecord[] = records(raw.fuels, "fuels").map((item) => ({
    id: str(item.id) || createId(),
    date: str(item.date),
    vehicleId: str(item.vehicleId),
    station: str(item.station),
    liters: num(item.liters),
    pricePerLiter: num(item.pricePerLiter),
    totalPrice: num(item.totalPrice),
    odometer: num(item.odometer),
    note: str(item.note)
  }));

  const drivers: Driver[] =
    raw.drivers === undefined || raw.drivers === null
      ? [...new Set(trips.map((trip) => trip.driver).filter(Boolean))].map((name) => ({ id: createId(), name, note: "" }))
      : records(raw.drivers, "drivers").map((item) => ({
          id: str(item.id) || createId(),
          name: str(item.name),
          note: str(item.note)
        }));

  const places: Place[] =
    raw.places === undefined || raw.places === null
      ? [...new Set(trips.flatMap((trip) => [trip.from, trip.to]).filter(Boolean))].map((name) => ({ id: createId(), name, note: "" }))
      : records(raw.places, "places").map((item) => ({
          id: str(item.id) || createId(),
          name: str(item.name),
          note: str(item.note)
        }));

  const rawSettings = typeof raw.settings === "object" && raw.settings !== null && !Array.isArray(raw.settings) ? (raw.settings as Record<string, unknown>) : {};
  const defaults = defaultSettings();

  return {
    version: 1,
    vehicles,
    drivers,
    places,
    trips,
    fuels,
    settings: {
      highKmPerDayThreshold: num(rawSettings.highKmPerDayThreshold, defaults.highKmPerDayThreshold),
      autoBackup: typeof rawSettings.autoBackup === "boolean" ? rawSettings.autoBackup : defaults.autoBackup,
      theme: rawSettings.theme === "dark" ? "dark" : "light"
    }
  };
}
