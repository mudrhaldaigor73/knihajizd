import type { LogbookData, Trip } from "../../../shared/types";
import { createId, tripKm } from "./data";
import { validateTrip } from "./validation";

export type RepeatFrequency = "daily" | "weekly" | "monthly";

export interface RepeatSettings {
  enabled: boolean;
  frequency: RepeatFrequency;
  count: number;
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addMinutesToTime(time: string, minutesToAdd: number) {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Příjezd dřívější než odjezd znamená jízdu přes půlnoc (+1 den).
export const isOvernight = (trip: Pick<Trip, "departureTime" | "arrivalTime">) =>
  trip.arrivalTime < trip.departureTime;

export function tripDurationMinutes(trip: Pick<Trip, "departureTime" | "arrivalTime">) {
  const diff = (timeToMinutes(trip.arrivalTime) - timeToMinutes(trip.departureTime) + 1440) % 1440;
  return Math.max(1, diff);
}

export function clampRepeatCount(value: string) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 2;
  return Math.min(60, Math.max(2, Math.floor(count)));
}

export function repeatedTrips(source: Trip, repeat: RepeatSettings): Trip[] {
  const count = clampRepeatCount(String(repeat.count));
  const km = tripKm(source);
  return Array.from({ length: count }, (_, index) => {
    const odometerStart = Number(source.odometerStart) + km * index;
    return {
      ...source,
      id: index === 0 ? source.id : createId(),
      date: addRepeatDate(source.date, repeat.frequency, index),
      odometerStart,
      odometerEnd: odometerStart + km
    };
  });
}

export function withReturnTrips(trips: Trip[]): Trip[] {
  if (!trips.length) return [];
  let nextOdometerStart = Number(trips[0].odometerStart);
  return trips.flatMap((trip) => {
    const km = tripKm(trip);
    const outbound = {
      ...trip,
      odometerStart: nextOdometerStart,
      odometerEnd: nextOdometerStart + km
    };
    const inbound = createReturnTrip(outbound);
    nextOdometerStart = Number(inbound.odometerEnd);
    return [outbound, inbound];
  });
}

export function createReturnTrip(trip: Trip): Trip {
  const km = tripKm(trip);
  const departureTime = trip.arrivalTime;
  const arrivalTime = addMinutesToTime(trip.arrivalTime, tripDurationMinutes(trip));
  return {
    ...trip,
    id: createId(),
    date: isOvernight(trip) ? addDays(trip.date, 1) : trip.date,
    departureTime,
    arrivalTime,
    from: trip.to,
    to: trip.from,
    odometerStart: Number(trip.odometerEnd),
    odometerEnd: Number(trip.odometerEnd) + km
  };
}

export function collectGeneratedTripErrors(trips: Trip[], data: LogbookData) {
  let acceptedTrips = [...data.trips];
  const errors = [];
  for (const trip of trips) {
    const tripErrors = validateTrip(trip, { ...data, trips: acceptedTrips }).filter((issue) => issue.severity === "error");
    if (tripErrors.length) errors.push(...tripErrors);
    acceptedTrips = [...acceptedTrips, trip];
  }
  return errors;
}

export function repeatPreview(source: Trip, repeat: RepeatSettings, includeReturnTrip = false) {
  const trips = repeatedTrips(source, repeat);
  const tripCount = includeReturnTrip ? trips.length * 2 : trips.length;
  const first = trips[0]?.date ?? source.date;
  const last = trips.at(-1)?.date ?? source.date;
  const km = tripKm(source);
  return `${tripCount} jízd, ${first} až ${last}, celkem ${tripCount * km} km`;
}

export function addRepeatDate(date: string, frequency: RepeatFrequency, offset: number) {
  if (frequency === "daily") return addDays(date, offset);
  if (frequency === "weekly") return addDays(date, offset * 7);
  return addMonths(date, offset);
}

export function addDays(date: string, days: number) {
  const { year, month, day } = parseDate(date);
  return formatDate(new Date(year, month - 1, day + days));
}

export function addMonths(date: string, months: number) {
  const { year, month, day } = parseDate(date);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  return formatDate(new Date(targetYear, normalizedMonthIndex, Math.min(day, maxDay)));
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
