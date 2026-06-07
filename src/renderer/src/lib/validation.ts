import type { LogbookData, Trip } from "../types";
import { tripKm } from "./data";

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
}

const required = (value: string | number | undefined | null) => value !== undefined && value !== null && String(value).trim() !== "";
const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
};

export function validateTrip(trip: Trip, data: LogbookData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields: Array<[keyof Trip, string]> = [
    ["date", "datum"],
    ["departureTime", "čas odjezdu"],
    ["arrivalTime", "čas příjezdu"],
    ["vehicleId", "vozidlo"],
    ["driver", "řidič"],
    ["from", "místo odjezdu"],
    ["to", "místo příjezdu"],
    ["purpose", "účel cesty"]
  ];

  requiredFields.forEach(([key, label]) => {
    if (!required(trip[key] as string)) issues.push({ id: `${trip.id}-${key}`, severity: "error", message: `Chybí povinné pole: ${label}.` });
  });

  if (Number(trip.odometerEnd) <= Number(trip.odometerStart)) {
    issues.push({ id: `${trip.id}-odo`, severity: "error", message: "Konečný stav tachometru musí být vyšší než počáteční." });
  }

  if (trip.arrivalTime <= trip.departureTime) {
    issues.push({ id: `${trip.id}-time`, severity: "error", message: "Čas příjezdu musí být později než čas odjezdu." });
  }

  const sameVehicleTrips = data.trips
    .filter((item) => item.vehicleId === trip.vehicleId && item.id !== trip.id)
    .sort((a, b) => `${a.date} ${a.departureTime}`.localeCompare(`${b.date} ${b.departureTime}`));

  const previous = sameVehicleTrips.filter((item) => `${item.date} ${item.departureTime}` <= `${trip.date} ${trip.departureTime}`).at(-1);
  if (previous && Number(trip.odometerStart) !== Number(previous.odometerEnd)) {
    issues.push({
      id: `${trip.id}-continuity-prev`,
      severity: "warning",
      message: `Tachometr nenavazuje na předchozí jízdu. Očekáváno ${previous.odometerEnd} km.`
    });
  }

  const duplicate = sameVehicleTrips.find(
    (item) =>
      item.date === trip.date &&
      item.departureTime === trip.departureTime &&
      item.arrivalTime === trip.arrivalTime &&
      item.from.trim().toLowerCase() === trip.from.trim().toLowerCase() &&
      item.to.trim().toLowerCase() === trip.to.trim().toLowerCase()
  );
  if (duplicate) issues.push({ id: `${trip.id}-duplicate`, severity: "warning", message: "Možná duplicita jízdy se stejným časem a trasou." });

  const dayKm = data.trips
    .filter((item) => item.vehicleId === trip.vehicleId && item.date === trip.date && item.id !== trip.id)
    .reduce((sum, item) => sum + tripKm(item), tripKm(trip));
  if (dayKm > data.settings.highKmPerDayThreshold) {
    issues.push({ id: `${trip.id}-high-km`, severity: "warning", message: `Podezřele vysoký počet kilometrů za den: ${dayKm} km.` });
  }

  const overlap = sameVehicleTrips.find((item) => {
    if (item.date !== trip.date) return false;
    return minutes(trip.departureTime) < minutes(item.arrivalTime) && minutes(trip.arrivalTime) > minutes(item.departureTime);
  });
  if (overlap) issues.push({ id: `${trip.id}-overlap`, severity: "warning", message: "Čas jízdy se překrývá s jinou jízdou stejného vozidla." });

  return issues;
}

export function validateAllTrips(data: LogbookData) {
  return data.trips.flatMap((trip) => validateTrip(trip, data));
}
