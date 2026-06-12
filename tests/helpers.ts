import type { Driver, FuelRecord, LogbookData, Trip, Vehicle } from "../src/shared/types";

export const vehicle = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: "v1",
  spz: "1AB 2345",
  brand: "Škoda",
  model: "Octavia",
  year: 2020,
  fuel: "benzín",
  initialOdometer: 1000,
  note: "",
  ...over
});

export const driver = (over: Partial<Driver> = {}): Driver => ({
  id: "d1",
  name: "Igor",
  note: "",
  ...over
});

export const trip = (over: Partial<Trip> = {}): Trip => ({
  id: "t1",
  date: "2026-06-01",
  departureTime: "08:00",
  arrivalTime: "09:00",
  vehicleId: "v1",
  driver: "Igor",
  from: "Brno",
  to: "Praha",
  purpose: "obchodní jednání",
  type: "služební",
  odometerStart: 1000,
  odometerEnd: 1100,
  note: "",
  ...over
});

export const fuel = (over: Partial<FuelRecord> = {}): FuelRecord => ({
  id: "f1",
  date: "2026-06-01",
  vehicleId: "v1",
  station: "MOL",
  liters: 40,
  pricePerLiter: 38,
  totalPrice: 1520,
  odometer: 1100,
  note: "",
  ...over
});

export const logbook = (over: Partial<LogbookData> = {}): LogbookData => ({
  version: 1,
  vehicles: [vehicle()],
  drivers: [driver()],
  places: [],
  trips: [],
  fuels: [],
  settings: {
    highKmPerDayThreshold: 800,
    autoBackup: true,
    theme: "light"
  },
  ...over
});
