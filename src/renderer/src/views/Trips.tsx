import { Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { LogbookData, Trip } from "../../../shared/types";
import { Input, IssueList, PlaceInput, Select } from "../components/fields";
import { autoFillOdometerStart, blankTrip, getLastOdometer, tripKm, vehicleName } from "../lib/data";
import { collectGeneratedTripErrors, isOvernight, repeatPreview, repeatedTrips, withReturnTrips, type RepeatSettings } from "../lib/tripGenerators";
import { validateTrip } from "../lib/validation";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

const defaultRepeat: RepeatSettings = { enabled: false, frequency: "weekly", count: 2 };

export function Trips({ data, updateData }: { data: LogbookData; updateData: UpdateData }) {
  const [form, setForm] = useState<Trip>(blankTrip(data.vehicles[0]?.id ?? "", data.drivers[0]?.name ?? ""));
  const [repeat, setRepeat] = useState<RepeatSettings>(defaultRepeat);
  const [returnTrip, setReturnTrip] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("vše");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("vše");
  const [driverFilter, setDriverFilter] = useState("vše");
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const driverNames = [...new Set([...data.drivers.map((driver) => driver.name), ...data.trips.map((trip) => trip.driver)])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "cs-CZ"));
  const isEditing = data.trips.some((trip) => trip.id === form.id);
  const formIssues = validateTrip(form, { ...data, trips: data.trips.filter((trip) => trip.id !== form.id) });

  useEffect(() => {
    if (!form.driver && data.drivers[0]?.name) setForm((current) => ({ ...current, driver: data.drivers[0].name }));
  }, [data.drivers, form.driver]);

  const filtered = data.trips.filter((trip) => {
    const text = `${trip.date} ${trip.driver} ${trip.from} ${trip.to} ${trip.purpose} ${vehicleName(vehicles.get(trip.vehicleId))}`.toLowerCase();
    return (
      text.includes(query.toLowerCase()) &&
      (type === "vše" || trip.type === type) &&
      (vehicleFilter === "vše" || trip.vehicleId === vehicleFilter) &&
      (driverFilter === "vše" || trip.driver === driverFilter) &&
      (!dateFrom || trip.date >= dateFrom) &&
      (!dateTo || trip.date <= dateTo)
    );
  });
  const resetForm = () => {
    setRepeat(defaultRepeat);
    setReturnTrip(false);
    setForm(blankTrip(data.vehicles[0]?.id ?? "", data.drivers[0]?.name ?? ""));
  };
  const save = () => {
    const prepared = autoFillOdometerStart(form, data);
    const preparedIssues = validateTrip(prepared, { ...data, trips: data.trips.filter((trip) => trip.id !== prepared.id) });
    if (preparedIssues.some((issue) => issue.severity === "error")) return alert("Jízdu nelze uložit, opravte povinná pole a tachometr.");
    const baseTrips = !isEditing && repeat.enabled ? repeatedTrips(prepared, repeat) : [prepared];
    const tripsToSave = !isEditing && returnTrip ? withReturnTrips(baseTrips) : baseTrips;
    if (!isEditing && repeat.enabled && tripsToSave.length < 2) return alert("Pro opakování nastavte počet alespoň 2 jízdy.");
    const generatedErrors = collectGeneratedTripErrors(tripsToSave, data);
    if (generatedErrors.length) return alert(`Opakované jízdy nelze uložit: ${generatedErrors[0].message}`);
    updateData((current) => ({ ...current, trips: current.trips.some((item) => item.id === prepared.id) ? current.trips.map((item) => item.id === prepared.id ? prepared : item) : [...current.trips, ...tripsToSave] }));
    resetForm();
  };
  const remove = (id: string) => {
    if (!confirm("Opravdu smazat tuto jízdu?")) return;
    updateData((current) => ({ ...current, trips: current.trips.filter((item) => item.id !== id) }));
  };
  return (
    <section className="stack">
      <div className="panel">
        <div className="section-title"><h2>Jízda</h2><span>Ujeto {tripKm(form)} km{isOvernight(form) ? ", příjezd následující den" : ""}</span></div>
        <div className="form-grid trip-form">
          <Input label="Datum" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
          <Input label="Čas odjezdu" type="time" value={form.departureTime} onChange={(departureTime) => setForm({ ...form, departureTime })} />
          <Input label="Čas příjezdu" type="time" value={form.arrivalTime} onChange={(arrivalTime) => setForm({ ...form, arrivalTime })} />
          <Select label="Vozidlo" value={form.vehicleId} onChange={(vehicleId) => setForm({ ...form, vehicleId, odometerStart: getLastOdometer(data, vehicleId), odometerEnd: getLastOdometer(data, vehicleId) })} options={data.vehicles.map((vehicle) => [vehicle.id, vehicleName(vehicle)])} />
          <Select label="Řidič" value={form.driver} onChange={(driver) => setForm({ ...form, driver })} options={driverOptions(data, form.driver)} />
          <PlaceInput label="Odkud" value={form.from} places={data.places} onChange={(from) => setForm({ ...form, from })} />
          <PlaceInput label="Kam" value={form.to} places={data.places} onChange={(to) => setForm({ ...form, to })} />
          <Input label="Účel cesty" value={form.purpose} onChange={(purpose) => setForm({ ...form, purpose })} />
          <Select label="Typ cesty" value={form.type} onChange={(value) => setForm({ ...form, type: value as Trip["type"] })} options={[["služební", "služební"], ["soukromá", "soukromá"]]} />
          <Input label="Tachometr odjezd" type="number" value={form.odometerStart} onChange={(odometerStart) => setForm({ ...form, odometerStart: Number(odometerStart) })} />
          <Input label="Tachometr příjezd" type="number" value={form.odometerEnd} onChange={(odometerEnd) => setForm({ ...form, odometerEnd: Number(odometerEnd) })} />
          <label><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
          {!isEditing && (
            <>
              <label className="switch"><input type="checkbox" checked={returnTrip} onChange={(event) => setReturnTrip(event.target.checked)} /><span>Zpět</span></label>
              <label className="switch"><input type="checkbox" checked={repeat.enabled} onChange={(event) => setRepeat({ ...repeat, enabled: event.target.checked })} /><span>Opakovat jízdu</span></label>
              {repeat.enabled && (
                <>
                  <Select label="Opakování" value={repeat.frequency} onChange={(frequency) => setRepeat({ ...repeat, frequency: frequency as RepeatSettings["frequency"] })} options={[["daily", "denně"], ["weekly", "týdně"], ["monthly", "měsíčně"]]} />
                  <Input label="Počet jízd celkem" type="number" value={repeat.count} onChange={(count) => setRepeat({ ...repeat, count: Math.min(60, Math.max(2, Math.floor(Number(count) || 2))) })} />
                  <label className="full"><span>Náhled opakování</span><input readOnly value={repeatPreview(form, repeat, returnTrip)} /></label>
                </>
              )}
            </>
          )}
        </div>
        <IssueList issues={formIssues} />
        <div className="actions left"><button className="primary" onClick={save}><Plus size={16} /> Uložit jízdu</button><button onClick={resetForm}>Vyčistit</button></div>
      </div>
      <div className="panel">
        <div className="toolbar"><div className="search"><Search size={16} /><input placeholder="Hledat podle trasy, řidiče, účelu nebo vozidla" value={query} onChange={(event) => setQuery(event.target.value)} /></div><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} title="Datum od" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} title="Datum do" /><select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} title="Filtr vozidla"><option value="vše">všechna vozidla</option>{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleName(vehicle)}</option>)}</select><select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)} title="Filtr řidiče"><option value="vše">všichni řidiči</option>{driverNames.map((name) => <option key={name} value={name}>{name}</option>)}</select><select value={type} onChange={(event) => setType(event.target.value)}><option>vše</option><option>služební</option><option>soukromá</option></select></div>
        <table>
          <thead><tr><th>Datum</th><th>Čas</th><th>Vozidlo</th><th>Řidič</th><th>Trasa</th><th>Tachometr konec</th><th>Typ</th><th>Km</th><th></th></tr></thead>
          <tbody>{filtered.sort((a, b) => `${b.date} ${b.departureTime}`.localeCompare(`${a.date} ${a.departureTime}`)).map((trip) => <tr key={trip.id}><td>{trip.date}</td><td>{trip.departureTime}-{trip.arrivalTime}{isOvernight(trip) ? " (+1)" : ""}</td><td>{vehicleName(vehicles.get(trip.vehicleId))}</td><td>{trip.driver}</td><td>{trip.from} - {trip.to}</td><td>{trip.odometerEnd}</td><td>{trip.type}</td><td>{tripKm(trip)}</td><td className="row-actions"><button onClick={() => setForm(trip)}>Upravit</button><button className="danger" onClick={() => remove(trip.id)} title="Smazat"><Trash2 size={16} /></button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function driverOptions(data: LogbookData, currentDriver: string): Array<[string, string]> {
  const options = data.drivers.map((driver) => [driver.name, driver.name] as [string, string]);
  if (currentDriver && !options.some(([value]) => value === currentDriver)) options.push([currentDriver, currentDriver]);
  return options;
}
