import type { FuelRecord, LogbookData, Trip } from "./types.js";

export interface PeriodSummary {
  period: string;
  km: number;
  business: number;
  private: number;
  fuel: number;
}

const tripKm = (trip: Trip) => Math.max(0, Number(trip.odometerEnd) - Number(trip.odometerStart));
const fuelTotal = (fuel: FuelRecord) => Number(fuel.totalPrice) || Number(fuel.liters) * Number(fuel.pricePerLiter);

function aggregate(data: LogbookData, keyOf: (date: string) => string): PeriodSummary[] {
  const periods = new Map<string, PeriodSummary>();
  const period = (key: string) => {
    const item = periods.get(key) ?? { period: key, km: 0, business: 0, private: 0, fuel: 0 };
    periods.set(key, item);
    return item;
  };
  data.trips.forEach((trip) => {
    const item = period(keyOf(trip.date));
    const km = tripKm(trip);
    item.km += km;
    item[trip.type === "služební" ? "business" : "private"] += km;
  });
  data.fuels.forEach((fuel) => {
    period(keyOf(fuel.date)).fuel += fuelTotal(fuel);
  });
  return [...periods.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export const monthlySummaries = (data: LogbookData) => aggregate(data, (date) => date.slice(0, 7));
export const yearlySummaries = (data: LogbookData) => aggregate(data, (date) => date.slice(0, 4));
