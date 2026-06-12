import ExcelJS from "exceljs";
import type { FuelRecord, LogbookData, Trip, Vehicle } from "./types.js";

const vehicleLabel = (vehicle?: Vehicle) =>
  vehicle ? `${vehicle.brand} ${vehicle.model}`.trim() || vehicle.spz : "";

const tripKm = (trip: Trip) => Math.max(0, Number(trip.odometerEnd) - Number(trip.odometerStart));
const fuelTotal = (fuel: FuelRecord) => Number(fuel.totalPrice) || Number(fuel.liters) * Number(fuel.pricePerLiter);
const monthKey = (date: string) => date.slice(0, 7);

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount }
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.columns.forEach((column) => {
    column.width = Math.max(column.width ?? 12, 14);
  });
}

export function buildWorkbook(data: LogbookData): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kniha jízd";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const trips = [...data.trips].sort((a, b) => `${a.date} ${a.departureTime}`.localeCompare(`${b.date} ${b.departureTime}`));

  const tripsSheet = workbook.addWorksheet("Kniha jízd");
  tripsSheet.columns = [
    { header: "Datum", key: "date", width: 13 },
    { header: "Čas odjezdu", key: "departureTime", width: 14 },
    { header: "Čas příjezdu", key: "arrivalTime", width: 14 },
    { header: "Vozidlo", key: "vehicle", width: 24 },
    { header: "SPZ", key: "spz", width: 13 },
    { header: "Řidič", key: "driver", width: 20 },
    { header: "Odkud", key: "from", width: 24 },
    { header: "Kam", key: "to", width: 24 },
    { header: "Účel cesty", key: "purpose", width: 28 },
    { header: "Typ cesty", key: "type", width: 14 },
    { header: "Tachometr začátek", key: "odometerStart", width: 20 },
    { header: "Tachometr konec", key: "odometerEnd", width: 18 },
    { header: "Ujeto km", key: "km", width: 12 },
    { header: "Poznámka", key: "note", width: 30 }
  ];
  trips.forEach((trip) => {
    const vehicle = vehicles.get(trip.vehicleId);
    tripsSheet.addRow({ ...trip, vehicle: vehicleLabel(vehicle), spz: vehicle?.spz ?? "", km: tripKm(trip) });
  });
  const tripsTotalRow = tripsSheet.addRow({
    purpose: "Celkem",
    km: { formula: `SUM(M2:M${Math.max(2, trips.length + 1)})` }
  });
  tripsTotalRow.font = { bold: true };
  styleSheet(tripsSheet);

  const fuelSheet = workbook.addWorksheet("Tankování");
  fuelSheet.columns = [
    { header: "Datum", key: "date", width: 13 },
    { header: "Vozidlo", key: "vehicle", width: 24 },
    { header: "SPZ", key: "spz", width: 13 },
    { header: "Čerpací stanice", key: "station", width: 24 },
    { header: "Množství litrů", key: "liters", width: 16 },
    { header: "Cena za litr", key: "pricePerLiter", width: 14 },
    { header: "Celková cena", key: "totalPrice", width: 15 },
    { header: "Stav tachometru", key: "odometer", width: 18 },
    { header: "Poznámka", key: "note", width: 30 }
  ];
  data.fuels.forEach((fuel) => {
    const vehicle = vehicles.get(fuel.vehicleId);
    fuelSheet.addRow({ ...fuel, vehicle: vehicleLabel(vehicle), spz: vehicle?.spz ?? "", totalPrice: fuelTotal(fuel) });
  });
  const fuelTotalRow = fuelSheet.addRow({
    station: "Celkem",
    totalPrice: { formula: `SUM(G2:G${Math.max(2, data.fuels.length + 1)})` }
  });
  fuelTotalRow.font = { bold: true };
  styleSheet(fuelSheet);

  const monthly = new Map<string, { km: number; business: number; private: number; fuel: number }>();
  trips.forEach((trip) => {
    const key = monthKey(trip.date);
    const item = monthly.get(key) ?? { km: 0, business: 0, private: 0, fuel: 0 };
    item.km += tripKm(trip);
    item[trip.type === "služební" ? "business" : "private"] += tripKm(trip);
    monthly.set(key, item);
  });
  data.fuels.forEach((fuel) => {
    const key = monthKey(fuel.date);
    const item = monthly.get(key) ?? { km: 0, business: 0, private: 0, fuel: 0 };
    item.fuel += fuelTotal(fuel);
    monthly.set(key, item);
  });

  const monthSheet = workbook.addWorksheet("Měsíční souhrn");
  monthSheet.columns = [
    { header: "Měsíc", key: "month", width: 12 },
    { header: "Celkem km", key: "km", width: 14 },
    { header: "Služební km", key: "business", width: 15 },
    { header: "Soukromé km", key: "private", width: 15 },
    { header: "Náklady tankování", key: "fuel", width: 18 }
  ];
  [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([month, values]) => monthSheet.addRow({ month, ...values }));
  styleSheet(monthSheet);

  const yearSheet = workbook.addWorksheet("Roční souhrn");
  yearSheet.columns = [
    { header: "Rok", key: "year", width: 10 },
    { header: "Celkem km", key: "km", width: 14 },
    { header: "Služební km", key: "business", width: 15 },
    { header: "Soukromé km", key: "private", width: 15 },
    { header: "Náklady tankování", key: "fuel", width: 18 },
    { header: "Datum vytvoření exportu", key: "createdAt", width: 26 }
  ];
  const yearly = new Map<string, { km: number; business: number; private: number; fuel: number }>();
  monthly.forEach((value, key) => {
    const year = key.slice(0, 4);
    const item = yearly.get(year) ?? { km: 0, business: 0, private: 0, fuel: 0 };
    item.km += value.km;
    item.business += value.business;
    item.private += value.private;
    item.fuel += value.fuel;
    yearly.set(year, item);
  });
  yearly.forEach((values, year) => yearSheet.addRow({ year, ...values, createdAt: new Date().toLocaleString("cs-CZ") }));
  styleSheet(yearSheet);

  const vehiclesSheet = workbook.addWorksheet("Vozidla");
  vehiclesSheet.columns = [
    { header: "SPZ", key: "spz", width: 13 },
    { header: "Značka", key: "brand", width: 16 },
    { header: "Model", key: "model", width: 18 },
    { header: "Rok výroby", key: "year", width: 14 },
    { header: "Druh paliva", key: "fuel", width: 16 },
    { header: "Počáteční stav tachometru", key: "initialOdometer", width: 27 },
    { header: "Poznámka", key: "note", width: 30 }
  ];
  data.vehicles.forEach((vehicle) => vehiclesSheet.addRow(vehicle));
  styleSheet(vehiclesSheet);

  [tripsSheet, fuelSheet, monthSheet, yearSheet, vehiclesSheet].forEach((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9E2F3" } },
          left: { style: "thin", color: { argb: "FFD9E2F3" } },
          bottom: { style: "thin", color: { argb: "FFD9E2F3" } },
          right: { style: "thin", color: { argb: "FFD9E2F3" } }
        };
      });
    });
  });

  return workbook;
}

// BOM na začátku zajistí správnou diakritiku při otevření CSV v Excelu.
export function buildTripsCsv(data: LogbookData): string {
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const header = [
    "Datum",
    "Čas odjezdu",
    "Čas příjezdu",
    "Vozidlo",
    "SPZ",
    "Řidič",
    "Odkud",
    "Kam",
    "Účel cesty",
    "Typ cesty",
    "Tachometr začátek",
    "Tachometr konec",
    "Ujeto km",
    "Poznámka"
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = data.trips.map((trip) => {
    const vehicle = vehicles.get(trip.vehicleId);
    return [
      trip.date,
      trip.departureTime,
      trip.arrivalTime,
      vehicleLabel(vehicle),
      vehicle?.spz ?? "",
      trip.driver,
      trip.from,
      trip.to,
      trip.purpose,
      trip.type,
      trip.odometerStart,
      trip.odometerEnd,
      tripKm(trip),
      trip.note
    ].map(escape).join(";");
  });
  return "\uFEFF" + [header.map(escape).join(";"), ...rows].join("\r\n");
}
