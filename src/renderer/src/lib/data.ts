import { emptyLogbook } from "../../../shared/parseLogbook";
import type { Driver, FuelRecord, LogbookData, Place, Trip, Vehicle } from "../../../shared/types";

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const emptyData = emptyLogbook;

export const blankDriver = (): Driver => ({
  id: createId(),
  name: "",
  note: ""
});

export const blankPlace = (): Place => ({
  id: createId(),
  name: "",
  note: ""
});

export const blankVehicle = (): Vehicle => ({
  id: createId(),
  spz: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  fuel: "benzín",
  initialOdometer: 0,
  note: ""
});

export const blankTrip = (vehicleId = "", driver = ""): Trip => ({
  id: createId(),
  date: new Date().toISOString().slice(0, 10),
  departureTime: "08:00",
  arrivalTime: "09:00",
  vehicleId,
  driver,
  from: "",
  to: "",
  purpose: "",
  type: "služební",
  odometerStart: 0,
  odometerEnd: 0,
  note: ""
});

export const blankFuel = (vehicleId = ""): FuelRecord => ({
  id: createId(),
  date: new Date().toISOString().slice(0, 10),
  vehicleId,
  station: "",
  liters: 0,
  pricePerLiter: 0,
  totalPrice: 0,
  odometer: 0,
  note: ""
});

export const tripKm = (trip: Trip) => Math.max(0, Number(trip.odometerEnd) - Number(trip.odometerStart));
export const fuelTotal = (fuel: FuelRecord) => Number(fuel.totalPrice) || Number(fuel.liters) * Number(fuel.pricePerLiter);

export const vehicleName = (vehicle?: Vehicle) =>
  vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.spz})`.replace(/^ \(| \(\)$/g, "") : "Neznámé vozidlo";

export function recalculateOdometers(data: LogbookData, vehicleId?: string): LogbookData {
  const vehiclesToRecalculate = new Set(vehicleId ? [vehicleId] : data.vehicles.map((vehicle) => vehicle.id));
  const trips = data.trips.map((trip) => ({ ...trip }));
  const tripIndexesByVehicle = new Map<string, number[]>();

  trips.forEach((trip, index) => {
    if (!trip.vehicleId || !vehiclesToRecalculate.has(trip.vehicleId)) return;
    const indexes = tripIndexesByVehicle.get(trip.vehicleId) ?? [];
    indexes.push(index);
    tripIndexesByVehicle.set(trip.vehicleId, indexes);
  });

  data.vehicles.forEach((vehicle) => {
    if (!vehiclesToRecalculate.has(vehicle.id)) return;
    let odometer = Number(vehicle.initialOdometer) || 0;
    const indexes = tripIndexesByVehicle.get(vehicle.id) ?? [];
    indexes
      .sort((left, right) => compareTrips(trips[left], trips[right]) || left - right)
      .forEach((index) => {
        const trip = trips[index];
        const km = tripKm(trip);
        trips[index] = {
          ...trip,
          odometerStart: odometer,
          odometerEnd: odometer + km
        };
        odometer += km;
      });
  });

  return { ...data, trips };
}

// Po uložení jízdy (typicky zadané zpětně) posune tachometry všech
// chronologicky navazujících jízd stejného vozidla tak, aby na sebe
// navazovaly. Kilometry jednotlivých jízd zůstávají zachované; jízdy
// před uloženou jízdou a ostatní vozidla se nemění.
export function recalculateOdometersAfter(data: LogbookData, savedTrip: Trip): LogbookData {
  const ordered = data.trips
    .map((trip, index) => ({ trip, index }))
    .filter(({ trip }) => trip.vehicleId === savedTrip.vehicleId)
    .sort((left, right) => compareTrips(left.trip, right.trip) || left.index - right.index);
  const position = ordered.findIndex(({ trip }) => trip.id === savedTrip.id);
  if (position === -1) return data;

  const updates = new Map<string, Trip>();
  let odometer = Number(ordered[position].trip.odometerEnd);
  ordered.slice(position + 1).forEach(({ trip }) => {
    const km = tripKm(trip);
    if (Number(trip.odometerStart) !== odometer || Number(trip.odometerEnd) !== odometer + km) {
      updates.set(trip.id, { ...trip, odometerStart: odometer, odometerEnd: odometer + km });
    }
    odometer += km;
  });

  if (!updates.size) return data;
  return { ...data, trips: data.trips.map((trip) => updates.get(trip.id) ?? trip) };
}

export function previousTrip(data: LogbookData, trip: Trip): Trip | undefined {
  return data.trips
    .filter((item) => item.vehicleId === trip.vehicleId && item.id !== trip.id && `${item.date} ${item.departureTime}` <= `${trip.date} ${trip.departureTime}`)
    .sort((a, b) => compareTrips(a, b))
    .at(-1);
}

// Doplní chybějící (nulový) počáteční tachometr podle předchozí jízdy,
// případně podle počátečního stavu vozidla. Zadané hodnoty nepřepisuje.
export function autoFillOdometerStart(trip: Trip, data: LogbookData): Trip {
  if (Number(trip.odometerStart) > 0) return trip;
  const previous = previousTrip(data, trip);
  const vehicle = data.vehicles.find((item) => item.id === trip.vehicleId);
  const start = previous ? Number(previous.odometerEnd) : Number(vehicle?.initialOdometer) || 0;
  if (!start) return trip;
  return { ...trip, odometerStart: start };
}

export function getLastOdometer(data: LogbookData, vehicleId?: string) {
  const vehicleTrips = data.trips.filter((trip) => !vehicleId || trip.vehicleId === vehicleId);
  const tripMax = Math.max(0, ...vehicleTrips.map((trip) => Number(trip.odometerEnd) || 0));
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  return Math.max(tripMax, vehicle?.initialOdometer ?? 0);
}

function compareTrips(left: Trip, right: Trip) {
  return `${left.date} ${left.departureTime} ${left.arrivalTime}`.localeCompare(`${right.date} ${right.departureTime} ${right.arrivalTime}`);
}

export function summary(data: LogbookData) {
  const totalKm = data.trips.reduce((sum, trip) => sum + tripKm(trip), 0);
  const businessKm = data.trips.filter((trip) => trip.type === "služební").reduce((sum, trip) => sum + tripKm(trip), 0);
  const privateKm = totalKm - businessKm;
  const fuelCosts = data.fuels.reduce((sum, fuel) => sum + fuelTotal(fuel), 0);
  const monthly = new Map<string, number>();
  data.trips.forEach((trip) => {
    const key = trip.date.slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + tripKm(trip));
  });
  return {
    totalTrips: data.trips.length,
    totalKm,
    businessKm,
    privateKm,
    fuelCosts,
    lastOdometer: Math.max(0, ...data.vehicles.map((vehicle) => getLastOdometer(data, vehicle.id))),
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b))
  };
}
