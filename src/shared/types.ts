export type TripType = "služební" | "soukromá";

export interface Vehicle {
  id: string;
  spz: string;
  brand: string;
  model: string;
  year: number;
  fuel: string;
  initialOdometer: number;
  note: string;
}

export interface Driver {
  id: string;
  name: string;
  note: string;
}

export interface Place {
  id: string;
  name: string;
  note: string;
}

export interface Trip {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  vehicleId: string;
  driver: string;
  from: string;
  to: string;
  purpose: string;
  type: TripType;
  odometerStart: number;
  odometerEnd: number;
  note: string;
}

export interface FuelRecord {
  id: string;
  date: string;
  vehicleId: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  totalPrice: number;
  odometer: number;
  note: string;
}

export interface LogbookData {
  version: 1;
  vehicles: Vehicle[];
  drivers: Driver[];
  places: Place[];
  trips: Trip[];
  fuels: FuelRecord[];
  settings: {
    highKmPerDayThreshold: number;
    autoBackup: boolean;
    theme: "light" | "dark";
    mapyApiKey: string;
  };
}

export interface FileState {
  path: string | null;
  data: LogbookData;
}

export interface SaveResult {
  ok: boolean;
  path?: string;
  message?: string;
}
