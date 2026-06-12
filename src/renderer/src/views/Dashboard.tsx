import type { LogbookData } from "../../../shared/types";
import { monthlySummaries, yearlySummaries, type PeriodSummary } from "../../../shared/summaries";
import { Metric } from "../components/fields";
import { summary, tripKm, vehicleName } from "../lib/data";

export function Dashboard({ data, stats, issues }: { data: LogbookData; stats: ReturnType<typeof summary>; issues: number }) {
  return (
    <section className="stack">
      <div className="metrics">
        <Metric label="Počet jízd" value={stats.totalTrips.toString()} />
        <Metric label="Celkem km" value={`${stats.totalKm} km`} />
        <Metric label="Služební km" value={`${stats.businessKm} km`} />
        <Metric label="Soukromé km" value={`${stats.privateKm} km`} />
        <Metric label="Tankování" value={`${stats.fuelCosts.toLocaleString("cs-CZ")} Kč`} />
        <Metric label="Poslední tachometr" value={`${stats.lastOdometer} km`} />
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>Měsíční přehled kilometrů</h2>
          <span>{issues ? `${issues} upozornění ke kontrole` : "Bez upozornění"}</span>
        </div>
        <div className="month-bars">
          {stats.monthly.length === 0 && <p className="muted">Zatím nejsou zadané žádné jízdy.</p>}
          {stats.monthly.map(([month, km]) => (
            <div className="bar-row" key={month}>
              <span>{month}</span>
              <div><i style={{ width: `${Math.max(5, (km / Math.max(1, stats.totalKm)) * 100)}%` }} /></div>
              <strong>{km} km</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="grid-two">
        <SummaryTable title="Měsíční souhrn" periodLabel="Měsíc" rows={monthlySummaries(data)} />
        <SummaryTable title="Roční souhrn" periodLabel="Rok" rows={yearlySummaries(data)} />
      </div>
      <RecentTrips data={data} />
    </section>
  );
}

function SummaryTable({ title, periodLabel, rows }: { title: string; periodLabel: string; rows: PeriodSummary[] }) {
  return (
    <section className="panel">
      <div className="section-title"><h2>{title}</h2></div>
      {rows.length === 0 && <p className="muted">Zatím nejsou žádná data.</p>}
      {rows.length > 0 && (
        <table>
          <thead><tr><th>{periodLabel}</th><th>Celkem km</th><th>Služební</th><th>Soukromé</th><th>Tankování</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.period}>
                <td>{row.period}</td>
                <td>{row.km} km</td>
                <td>{row.business} km</td>
                <td>{row.private} km</td>
                <td>{row.fuel.toLocaleString("cs-CZ")} Kč</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RecentTrips({ data }: { data: LogbookData }) {
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const trips = [...data.trips].sort((a, b) => `${b.date} ${b.departureTime}`.localeCompare(`${a.date} ${a.departureTime}`)).slice(0, 6);
  return (
    <section className="panel">
      <div className="section-title"><h2>Poslední jízdy</h2></div>
      <table>
        <thead><tr><th>Datum</th><th>Vozidlo</th><th>Trasa</th><th>Typ</th><th>Km</th></tr></thead>
        <tbody>{trips.map((trip) => <tr key={trip.id}><td>{trip.date}</td><td>{vehicleName(vehicles.get(trip.vehicleId))}</td><td>{trip.from} - {trip.to}</td><td>{trip.type}</td><td>{tripKm(trip)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
