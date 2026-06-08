import type { Driver, FuelRecord, LogbookData, Trip, Vehicle } from "../types";

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const emptyData = (): LogbookData => ({
  version: 1,
  vehicles: [],
  drivers: [],
  trips: [],
  fuels: [],
  settings: {
    highKmPerDayThreshold: 800,
    autoBackup: true,
    theme: "light"
  }
});

export const blankDriver = (): Driver => ({
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

export function getLastOdometer(data: LogbookData, vehicleId?: string) {
  const vehicleTrips = data.trips.filter((trip) => !vehicleId || trip.vehicleId === vehicleId);
  const tripMax = Math.max(0, ...vehicleTrips.map((trip) => Number(trip.odometerEnd) || 0));
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  return Math.max(tripMax, vehicle?.initialOdometer ?? 0);
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
