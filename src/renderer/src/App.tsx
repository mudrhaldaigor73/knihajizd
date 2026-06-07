import { Car, Download, Fuel, Gauge, LayoutDashboard, Moon, Plus, Save, Search, Settings, Sun, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FuelRecord, LogbookData, Trip, Vehicle } from "./types";
import { blankFuel, blankTrip, blankVehicle, emptyData, fuelTotal, getLastOdometer, summary, tripKm, vehicleName } from "./lib/data";
import { validateAllTrips, validateTrip } from "./lib/validation";

type View = "dashboard" | "vehicles" | "trips" | "fuels" | "export" | "settings";

const nav: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "vehicles", label: "Vozidla", icon: Car },
  { id: "trips", label: "Jízdy", icon: Gauge },
  { id: "fuels", label: "Tankování", icon: Fuel },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Nastavení", icon: Settings }
];

export function App() {
  const [data, setData] = useState<LogbookData>(emptyData());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [message, setMessage] = useState("");
  const stats = useMemo(() => summary(data), [data]);
  const issues = useMemo(() => validateAllTrips(data), [data]);

  useEffect(() => {
    void window.logbook.loadInitial().then((state) => {
      setData(state.data);
      setFilePath(state.path);
      document.documentElement.dataset.theme = state.data.settings.theme;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  async function save() {
    const result = await window.logbook.save(data);
    setMessage(result.ok ? `Uloženo: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
    if (result.path) setFilePath(result.path);
  }

  async function saveAs() {
    const result = await window.logbook.saveAs(data);
    setMessage(result.ok ? `Uloženo jako: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
    if (result.path) setFilePath(result.path);
  }

  async function openBook() {
    const state = await window.logbook.openBook();
    if (!state) return;
    setData(state.data);
    setFilePath(state.path);
    setMessage(`Otevřeno: ${state.path}`);
  }

  async function newBook() {
    if (!confirm("Opravdu vytvořit novou prázdnou knihu jízd? Neuložené změny budou ztraceny.")) return;
    const state = await window.logbook.newBook();
    setData(state.data);
    setFilePath(state.path);
    setMessage("Vytvořena nová kniha jízd.");
  }

  const updateData = (updater: (current: LogbookData) => LogbookData) => setData((current) => updater(current));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Gauge size={28} />
          <div>
            <strong>Kniha jízd</strong>
            <span>offline evidence</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="privacy">Data zůstávají pouze v počítači. Aplikace nepoužívá žádný server.</div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{nav.find((item) => item.id === view)?.label}</h1>
            <p>{filePath ?? "Nová kniha zatím není uložená"}</p>
          </div>
          <div className="actions">
            <button className="icon" onClick={() => updateData((current) => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === "dark" ? "light" : "dark" } }))} title="Přepnout režim">
              {data.settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={newBook}>Nová</button>
            <button onClick={openBook}>Otevřít</button>
            <button onClick={saveAs}>Uložit jako</button>
            <button className="primary" onClick={save}>
              <Save size={16} /> Uložit
            </button>
          </div>
        </header>

        {message && <div className="toast">{message}</div>}

        {view === "dashboard" && <Dashboard data={data} stats={stats} issues={issues.length} />}
        {view === "vehicles" && <Vehicles data={data} updateData={updateData} />}
        {view === "trips" && <Trips data={data} updateData={updateData} />}
        {view === "fuels" && <Fuels data={data} updateData={updateData} />}
        {view === "export" && <ExportPanel data={data} setData={setData} setMessage={setMessage} />}
        {view === "settings" && <SettingsPanel data={data} updateData={updateData} filePath={filePath} setMessage={setMessage} />}
      </main>
    </div>
  );
}

function Dashboard({ data, stats, issues }: { data: LogbookData; stats: ReturnType<typeof summary>; issues: number }) {
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
      <RecentTrips data={data} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function Vehicles({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<Vehicle>(blankVehicle());
  const edit = (vehicle: Vehicle) => setForm(vehicle);
  const save = () => {
    if (!form.spz.trim() || !form.brand.trim()) return alert("Vyplňte SPZ a značku vozidla.");
    updateData((current) => ({ ...current, vehicles: current.vehicles.some((item) => item.id === form.id) ? current.vehicles.map((item) => item.id === form.id ? form : item) : [...current.vehicles, form] }));
    setForm(blankVehicle());
  };
  const remove = (id: string) => {
    if (!confirm("Smazat vozidlo? Navázané jízdy zůstanou v evidenci, ale nebudou mít popis vozidla.")) return;
    updateData((current) => ({ ...current, vehicles: current.vehicles.filter((item) => item.id !== id) }));
  };
  return (
    <section className="grid-two">
      <div className="panel">
        <div className="section-title"><h2>Vozidlo</h2></div>
        <div className="form-grid">
          <Input label="SPZ" value={form.spz} onChange={(spz) => setForm({ ...form, spz })} />
          <Input label="Značka" value={form.brand} onChange={(brand) => setForm({ ...form, brand })} />
          <Input label="Model" value={form.model} onChange={(model) => setForm({ ...form, model })} />
          <Input label="Rok výroby" type="number" value={form.year} onChange={(year) => setForm({ ...form, year: Number(year) })} />
          <Input label="Druh paliva" value={form.fuel} onChange={(fuel) => setForm({ ...form, fuel })} />
          <Input label="Počáteční stav tachometru" type="number" value={form.initialOdometer} onChange={(initialOdometer) => setForm({ ...form, initialOdometer: Number(initialOdometer) })} />
          <label className="full"><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <div className="actions left"><button className="primary" onClick={save}><Plus size={16} /> Uložit vozidlo</button></div>
      </div>
      <div className="panel">
        <div className="section-title"><h2>Seznam vozidel</h2></div>
        <div className="cards">{data.vehicles.map((vehicle) => <article className="item" key={vehicle.id}><div><strong>{vehicleName(vehicle)}</strong><span>{vehicle.fuel}, počáteční tachometr {vehicle.initialOdometer} km</span></div><button onClick={() => edit(vehicle)}>Upravit</button><button className="danger" onClick={() => remove(vehicle.id)} title="Smazat"><Trash2 size={16} /></button></article>)}</div>
      </div>
    </section>
  );
}

function Trips({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<Trip>(blankTrip(data.vehicles[0]?.id ?? ""));
  const [query, setQuery] = useState("");
  const [type, setType] = useState("vše");
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const formIssues = validateTrip(form, { ...data, trips: data.trips.filter((trip) => trip.id !== form.id) });
  const filtered = data.trips.filter((trip) => {
    const text = `${trip.date} ${trip.driver} ${trip.from} ${trip.to} ${trip.purpose} ${vehicleName(vehicles.get(trip.vehicleId))}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (type === "vše" || trip.type === type);
  });
  const save = () => {
    if (formIssues.some((issue) => issue.severity === "error")) return alert("Jízdu nelze uložit, opravte povinná pole a tachometr.");
    updateData((current) => ({ ...current, trips: current.trips.some((item) => item.id === form.id) ? current.trips.map((item) => item.id === form.id ? form : item) : [...current.trips, form] }));
    setForm(blankTrip(data.vehicles[0]?.id ?? ""));
  };
  const remove = (id: string) => {
    if (!confirm("Opravdu smazat tuto jízdu?")) return;
    updateData((current) => ({ ...current, trips: current.trips.filter((item) => item.id !== id) }));
  };
  return (
    <section className="stack">
      <div className="panel">
        <div className="section-title"><h2>Jízda</h2><span>Ujeto {tripKm(form)} km</span></div>
        <div className="form-grid trip-form">
          <Input label="Datum" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
          <Input label="Čas odjezdu" type="time" value={form.departureTime} onChange={(departureTime) => setForm({ ...form, departureTime })} />
          <Input label="Čas příjezdu" type="time" value={form.arrivalTime} onChange={(arrivalTime) => setForm({ ...form, arrivalTime })} />
          <Select label="Vozidlo" value={form.vehicleId} onChange={(vehicleId) => setForm({ ...form, vehicleId, odometerStart: getLastOdometer(data, vehicleId), odometerEnd: getLastOdometer(data, vehicleId) })} options={data.vehicles.map((vehicle) => [vehicle.id, vehicleName(vehicle)])} />
          <Input label="Řidič" value={form.driver} onChange={(driver) => setForm({ ...form, driver })} />
          <Input label="Odkud" value={form.from} onChange={(from) => setForm({ ...form, from })} />
          <Input label="Kam" value={form.to} onChange={(to) => setForm({ ...form, to })} />
          <Input label="Účel cesty" value={form.purpose} onChange={(purpose) => setForm({ ...form, purpose })} />
          <Select label="Typ cesty" value={form.type} onChange={(value) => setForm({ ...form, type: value as Trip["type"] })} options={[["služební", "služební"], ["soukromá", "soukromá"]]} />
          <Input label="Tachometr odjezd" type="number" value={form.odometerStart} onChange={(odometerStart) => setForm({ ...form, odometerStart: Number(odometerStart) })} />
          <Input label="Tachometr příjezd" type="number" value={form.odometerEnd} onChange={(odometerEnd) => setForm({ ...form, odometerEnd: Number(odometerEnd) })} />
          <label><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <IssueList issues={formIssues} />
        <div className="actions left"><button className="primary" onClick={save}><Plus size={16} /> Uložit jízdu</button><button onClick={() => setForm(blankTrip(data.vehicles[0]?.id ?? ""))}>Vyčistit</button></div>
      </div>
      <div className="panel">
        <div className="toolbar"><div className="search"><Search size={16} /><input placeholder="Hledat podle trasy, řidiče, účelu nebo vozidla" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={type} onChange={(event) => setType(event.target.value)}><option>vše</option><option>služební</option><option>soukromá</option></select></div>
        <table>
          <thead><tr><th>Datum</th><th>Čas</th><th>Vozidlo</th><th>Řidič</th><th>Trasa</th><th>Typ</th><th>Km</th><th></th></tr></thead>
          <tbody>{filtered.sort((a, b) => `${b.date} ${b.departureTime}`.localeCompare(`${a.date} ${a.departureTime}`)).map((trip) => <tr key={trip.id}><td>{trip.date}</td><td>{trip.departureTime}-{trip.arrivalTime}</td><td>{vehicleName(vehicles.get(trip.vehicleId))}</td><td>{trip.driver}</td><td>{trip.from} - {trip.to}</td><td>{trip.type}</td><td>{tripKm(trip)}</td><td className="row-actions"><button onClick={() => setForm(trip)}>Upravit</button><button className="danger" onClick={() => remove(trip.id)} title="Smazat"><Trash2 size={16} /></button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function Fuels({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<FuelRecord>(blankFuel(data.vehicles[0]?.id ?? ""));
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const save = () => {
    if (!form.date || !form.vehicleId || !form.station) return alert("Vyplňte datum, vozidlo a čerpací stanici.");
    const normalized = { ...form, totalPrice: fuelTotal(form) };
    updateData((current) => ({ ...current, fuels: current.fuels.some((item) => item.id === form.id) ? current.fuels.map((item) => item.id === form.id ? normalized : item) : [...current.fuels, normalized] }));
    setForm(blankFuel(data.vehicles[0]?.id ?? ""));
  };
  const remove = (id: string) => {
    if (!confirm("Opravdu smazat tankování?")) return;
    updateData((current) => ({ ...current, fuels: current.fuels.filter((item) => item.id !== id) }));
  };
  return (
    <section className="grid-two">
      <div className="panel">
        <div className="section-title"><h2>Tankování</h2><span>{fuelTotal(form).toLocaleString("cs-CZ")} Kč</span></div>
        <div className="form-grid">
          <Input label="Datum" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
          <Select label="Vozidlo" value={form.vehicleId} onChange={(vehicleId) => setForm({ ...form, vehicleId })} options={data.vehicles.map((vehicle) => [vehicle.id, vehicleName(vehicle)])} />
          <Input label="Čerpací stanice" value={form.station} onChange={(station) => setForm({ ...form, station })} />
          <Input label="Množství litrů" type="number" value={form.liters} onChange={(liters) => setForm({ ...form, liters: Number(liters) })} />
          <Input label="Cena za litr" type="number" value={form.pricePerLiter} onChange={(pricePerLiter) => setForm({ ...form, pricePerLiter: Number(pricePerLiter) })} />
          <Input label="Celková cena" type="number" value={form.totalPrice} onChange={(totalPrice) => setForm({ ...form, totalPrice: Number(totalPrice) })} />
          <Input label="Stav tachometru" type="number" value={form.odometer} onChange={(odometer) => setForm({ ...form, odometer: Number(odometer) })} />
          <label><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <div className="actions left"><button className="primary" onClick={save}><Plus size={16} /> Uložit tankování</button></div>
      </div>
      <div className="panel">
        <div className="section-title"><h2>Záznamy</h2></div>
        <table><thead><tr><th>Datum</th><th>Vozidlo</th><th>Stanice</th><th>Litry</th><th>Cena</th><th></th></tr></thead><tbody>{data.fuels.map((fuel) => <tr key={fuel.id}><td>{fuel.date}</td><td>{vehicleName(vehicles.get(fuel.vehicleId))}</td><td>{fuel.station}</td><td>{fuel.liters}</td><td>{fuelTotal(fuel).toLocaleString("cs-CZ")} Kč</td><td className="row-actions"><button onClick={() => setForm(fuel)}>Upravit</button><button className="danger" onClick={() => remove(fuel.id)} title="Smazat"><Trash2 size={16} /></button></td></tr>)}</tbody></table>
      </div>
    </section>
  );
}

function ExportPanel({ data, setData, setMessage }: { data: LogbookData; setData: (data: LogbookData) => void; setMessage: (message: string) => void }) {
  const run = async (kind: "xlsx" | "csv") => {
    const result = kind === "xlsx" ? await window.logbook.exportXlsx(data) : await window.logbook.exportCsv(data);
    setMessage(result.ok ? `Export hotový: ${result.path}` : result.message ?? "Export se nezdařil.");
  };
  const importJson = async () => {
    const state = await window.logbook.importJson();
    if (!state) return;
    setData(state.data);
    setMessage(`Importováno: ${state.path}`);
  };
  return (
    <section className="panel export-panel">
      <h2>Export a import</h2>
      <p>Excel export obsahuje listy Kniha jízd, Tankování, Měsíční souhrn, Roční souhrn a Vozidla včetně českých hlaviček, filtrů, zmrazené hlavičky a součtů.</p>
      <div className="export-actions">
        <button className="primary" onClick={() => run("xlsx")}><Download size={18} /> Exportovat .xlsx</button>
        <button onClick={() => run("csv")}><Download size={18} /> Exportovat CSV</button>
        <button onClick={importJson}><Upload size={18} /> Importovat JSON</button>
      </div>
    </section>
  );
}

function SettingsPanel({ data, updateData, filePath, setMessage }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void; filePath: string | null; setMessage: (message: string) => void }) {
  const backup = async () => {
    const result = await window.logbook.backupNow(data);
    setMessage(result.ok ? `Záloha vytvořena: ${result.path}` : result.message ?? "Záloha se nezdařila.");
  };
  return (
    <section className="panel settings-panel">
      <h2>Nastavení</h2>
      <div className="settings-list">
        <label><span>Datový soubor</span><input value={filePath ?? "Soubor zatím nebyl uložen"} readOnly /></label>
        <label className="switch"><input type="checkbox" checked={data.settings.autoBackup} onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, autoBackup: event.target.checked } }))} /><span>Automatické zálohování před uložením</span></label>
        <Input label="Limit podezřelých km za den" type="number" value={data.settings.highKmPerDayThreshold} onChange={(highKmPerDayThreshold) => updateData((current) => ({ ...current, settings: { ...current.settings, highKmPerDayThreshold: Number(highKmPerDayThreshold) } }))} />
        <button onClick={backup}>Vytvořit ruční zálohu</button>
      </div>
    </section>
  );
}

function IssueList({ issues }: { issues: ReturnType<typeof validateTrip> }) {
  if (!issues.length) return null;
  return <div className="issues">{issues.map((issue) => <div className={issue.severity} key={issue.id}>{issue.message}</div>)}</div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <label><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Vyberte</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
