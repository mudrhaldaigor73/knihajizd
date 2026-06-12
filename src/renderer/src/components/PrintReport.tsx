import type { LogbookData } from "../../../shared/types";
import { monthlySummaries, yearlySummaries } from "../../../shared/summaries";
import { tripKm, vehicleName } from "../lib/data";
import { isOvernight } from "../lib/tripGenerators";

// Vykresluje se trvale, ale viditelný je pouze v tiskovém režimu
// (viz @media print v main.css).
export function PrintReport({ data }: { data: LogbookData }) {
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const trips = [...data.trips].sort((a, b) => `${a.date} ${a.departureTime}`.localeCompare(`${b.date} ${b.departureTime}`));
  const totalKm = trips.reduce((sum, trip) => sum + tripKm(trip), 0);
  const months = monthlySummaries(data);
  const years = yearlySummaries(data);
  return (
    <div className="print-report">
      <h1>Kniha jízd</h1>
      <p>
        Vytvořeno: {new Date().toLocaleDateString("cs-CZ")}
        {data.vehicles.length > 0 && <> | Vozidla: {data.vehicles.map((vehicle) => vehicleName(vehicle)).join(", ")}</>}
      </p>
      <table>
        <thead>
          <tr><th>Datum</th><th>Odjezd</th><th>Příjezd</th><th>Vozidlo</th><th>Řidič</th><th>Odkud</th><th>Kam</th><th>Účel</th><th>Typ</th><th>Tach. začátek</th><th>Tach. konec</th><th>Km</th></tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>{trip.date}</td>
              <td>{trip.departureTime}</td>
              <td>{trip.arrivalTime}{isOvernight(trip) ? " (+1)" : ""}</td>
              <td>{vehicleName(vehicles.get(trip.vehicleId))}</td>
              <td>{trip.driver}</td>
              <td>{trip.from}</td>
              <td>{trip.to}</td>
              <td>{trip.purpose}</td>
              <td>{trip.type}</td>
              <td>{trip.odometerStart}</td>
              <td>{trip.odometerEnd}</td>
              <td>{tripKm(trip)}</td>
            </tr>
          ))}
          <tr className="print-total">
            <td colSpan={11}>Celkem</td>
            <td>{totalKm}</td>
          </tr>
        </tbody>
      </table>
      <h2>Měsíční souhrn</h2>
      <table>
        <thead><tr><th>Měsíc</th><th>Celkem km</th><th>Služební km</th><th>Soukromé km</th><th>Tankování Kč</th></tr></thead>
        <tbody>{months.map((row) => <tr key={row.period}><td>{row.period}</td><td>{row.km}</td><td>{row.business}</td><td>{row.private}</td><td>{row.fuel.toLocaleString("cs-CZ")}</td></tr>)}</tbody>
      </table>
      <h2>Roční souhrn</h2>
      <table>
        <thead><tr><th>Rok</th><th>Celkem km</th><th>Služební km</th><th>Soukromé km</th><th>Tankování Kč</th></tr></thead>
        <tbody>{years.map((row) => <tr key={row.period}><td>{row.period}</td><td>{row.km}</td><td>{row.business}</td><td>{row.private}</td><td>{row.fuel.toLocaleString("cs-CZ")}</td></tr>)}</tbody>
      </table>
      <div className="print-signatures">
        <span>Datum: ____________________</span>
        <span>Podpis: ____________________</span>
      </div>
    </div>
  );
}
