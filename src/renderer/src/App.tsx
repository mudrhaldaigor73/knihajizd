import { Car, Download, Fuel, Gauge, LayoutDashboard, LogOut, MapPin, Moon, Plus, Save, Search, Settings, Sun, Trash2, Upload, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Driver, FuelRecord, LogbookData, Place, Trip, Vehicle } from "./types";
import { blankDriver, blankFuel, blankPlace, blankTrip, blankVehicle, createId, emptyData, fuelTotal, getLastOdometer, recalculateOdometers, summary, tripKm, vehicleName } from "./lib/data";
import { validateAllTrips, validateTrip } from "./lib/validation";
import { getLogbookApi } from "./lib/logbookApi";
import { isAuthenticated, signIn, signOut, usesDefaultPassword } from "./lib/auth";

type View = "dashboard" | "vehicles" | "drivers" | "places" | "trips" | "fuels" | "export" | "settings";
type RepeatFrequency = "daily" | "weekly" | "monthly";

interface RepeatSettings {
  enabled: boolean;
  frequency: RepeatFrequency;
  count: number;
}

const nav: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "vehicles", label: "Vozidla", icon: Car },
  { id: "drivers", label: "Řidiči", icon: Users },
  { id: "places", label: "Místa", icon: MapPin },
  { id: "trips", label: "Jízdy", icon: Gauge },
  { id: "fuels", label: "Tankování", icon: Fuel },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Nastavení", icon: Settings }
];

const logbookApi = getLogbookApi();

export function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [data, setData] = useState<LogbookData>(emptyData());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [message, setMessage] = useState("");
  const stats = useMemo(() => summary(data), [data]);
  const issues = useMemo(() => validateAllTrips(data), [data]);

  useEffect(() => {
    void logbookApi.loadInitial().then((state) => {
      setData(recalculateOdometers(state.data));
      setFilePath(state.path);
      document.documentElement.dataset.theme = state.data.settings.theme;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  async function save() {
    const normalized = recalculateOdometers(data);
    setData(normalized);
    const result = await logbookApi.save(normalized);
    setMessage(result.ok ? `Uloženo: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
    if (result.path) setFilePath(result.path);
  }

  async function saveAs() {
    const normalized = recalculateOdometers(data);
    setData(normalized);
    const result = await logbookApi.saveAs(normalized);
    setMessage(result.ok ? `Uloženo jako: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
    if (result.path) setFilePath(result.path);
  }

  async function openBook() {
    const state = await logbookApi.openBook();
    if (!state) return;
    setData(recalculateOdometers(state.data));
    setFilePath(state.path);
    setMessage(`Otevřeno: ${state.path}`);
  }

  async function newBook() {
    if (!confirm("Opravdu vytvořit novou prázdnou knihu jízd? Neuložené změny budou ztraceny.")) return;
    const state = await logbookApi.newBook();
    setData(state.data);
    setFilePath(state.path);
    setMessage("Vytvořena nová kniha jízd.");
  }

  const updateData = (updater: (current: LogbookData) => LogbookData) => setData((current) => updater(current));

  if (!authenticated) {
    return <LoginScreen onAuthenticated={() => setAuthenticated(true)} />;
  }

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
            <button className="icon" onClick={() => { signOut(); setAuthenticated(false); }} title="Odhlásit">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {message && <div className="toast">{message}</div>}

        {view === "dashboard" && <Dashboard data={data} stats={stats} issues={issues.length} />}
        {view === "vehicles" && <Vehicles data={data} updateData={updateData} />}
        {view === "drivers" && <Drivers data={data} updateData={updateData} />}
        {view === "places" && <Places data={data} updateData={updateData} />}
        {view === "trips" && <Trips data={data} updateData={updateData} />}
        {view === "fuels" && <Fuels data={data} updateData={updateData} />}
        {view === "export" && <ExportPanel data={data} setData={setData} setMessage={setMessage} />}
        {view === "settings" && <SettingsPanel data={data} setData={setData} updateData={updateData} filePath={filePath} setMessage={setMessage} />}
      </main>
    </div>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (await signIn(password)) {
      onAuthenticated();
      return;
    }
    setError("Nesprávné heslo.");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark">✓</div>
        <h1>Kniha jízd</h1>
        <p>Přístup je chráněný heslem.</p>
        <form onSubmit={submit}>
          <label>
            <span>Heslo</span>
            <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="primary" type="submit">Přihlásit</button>
        </form>
        {usesDefaultPassword && <small>Výchozí heslo je <code>knihajizd</code>. Pro ostrý provoz ho změňte v souboru <code>auth.ts</code>.</small>}
      </section>
    </main>
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
    updateData((current) => recalculateOdometers({ ...current, vehicles: current.vehicles.some((item) => item.id === form.id) ? current.vehicles.map((item) => item.id === form.id ? form : item) : [...current.vehicles, form] }, form.id));
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

function Drivers({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<Driver>(blankDriver());
  const isEditing = data.drivers.some((driver) => driver.id === form.id);
  const edit = (driver: Driver) => setForm(driver);
  const save = () => {
    const name = form.name.trim();
    if (!name) return alert("Vyplňte jméno řidiče.");
    if (!isEditing && data.drivers.length >= 3) return alert("V knize jízd mohou být maximálně 3 řidiči.");
    if (data.drivers.some((driver) => driver.id !== form.id && driver.name.trim().toLowerCase() === name.toLowerCase())) return alert("Tento řidič už je zadaný.");
    const normalized = { ...form, name };
    updateData((current) => ({ ...current, drivers: current.drivers.some((item) => item.id === form.id) ? current.drivers.map((item) => item.id === form.id ? normalized : item) : [...current.drivers, normalized] }));
    setForm(blankDriver());
  };
  const remove = (driver: Driver) => {
    if (!confirm("Smazat řidiče? Dříve uložené jízdy si ponechají jeho jméno.")) return;
    updateData((current) => ({ ...current, drivers: current.drivers.filter((item) => item.id !== driver.id) }));
    if (form.id === driver.id) setForm(blankDriver());
  };
  return (
    <section className="grid-two">
      <div className="panel">
        <div className="section-title"><h2>Řidič</h2><span>{data.drivers.length}/3 řidiči</span></div>
        <div className="form-grid">
          <Input label="Jméno řidiče" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <label className="full"><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <div className="actions left">
          <button className="primary" onClick={save}><Plus size={16} /> Uložit řidiče</button>
          <button onClick={() => setForm(blankDriver())}>Vyčistit</button>
        </div>
      </div>
      <div className="panel">
        <div className="section-title"><h2>Seznam řidičů</h2><span>Vyberou se ve formuláři jízdy</span></div>
        {data.drivers.length === 0 && <p className="muted">Zatím není zadaný žádný řidič.</p>}
        <div className="cards">{data.drivers.map((driver) => <article className="item" key={driver.id}><div><strong>{driver.name}</strong><span>{driver.note || "Bez poznámky"}</span></div><button onClick={() => edit(driver)}>Upravit</button><button className="danger" onClick={() => remove(driver)} title="Smazat"><Trash2 size={16} /></button></article>)}</div>
      </div>
    </section>
  );
}

function Places({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<Place>(blankPlace());
  const edit = (place: Place) => setForm(place);
  const save = () => {
    const name = form.name.trim();
    if (!name) return alert("Vyplňte název místa.");
    if (data.places.some((place) => place.id !== form.id && place.name.trim().toLowerCase() === name.toLowerCase())) return alert("Toto místo už je zadané.");
    const normalized = { ...form, name };
    updateData((current) => ({ ...current, places: current.places.some((item) => item.id === form.id) ? current.places.map((item) => item.id === form.id ? normalized : item) : [...current.places, normalized] }));
    setForm(blankPlace());
  };
  const remove = (place: Place) => {
    if (!confirm("Smazat místo? Dříve uložené jízdy si ponechají text místa.")) return;
    updateData((current) => ({ ...current, places: current.places.filter((item) => item.id !== place.id) }));
    if (form.id === place.id) setForm(blankPlace());
  };
  return (
    <section className="grid-two">
      <div className="panel">
        <div className="section-title"><h2>Místo</h2><span>{data.places.length} uložených míst</span></div>
        <div className="form-grid">
          <Input label="Název místa" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <label className="full"><span>Poznámka</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <div className="actions left">
          <button className="primary" onClick={save}><Plus size={16} /> Uložit místo</button>
          <button onClick={() => setForm(blankPlace())}>Vyčistit</button>
        </div>
      </div>
      <div className="panel">
        <div className="section-title"><h2>Seznam míst</h2><span>Nabízí se u polí Odkud a Kam</span></div>
        {data.places.length === 0 && <p className="muted">Zatím není zadané žádné místo.</p>}
        <div className="cards">{[...data.places].sort((a, b) => a.name.localeCompare(b.name, "cs-CZ")).map((place) => <article className="item" key={place.id}><div><strong>{place.name}</strong><span>{place.note || "Bez poznámky"}</span></div><button onClick={() => edit(place)}>Upravit</button><button className="danger" onClick={() => remove(place)} title="Smazat"><Trash2 size={16} /></button></article>)}</div>
      </div>
    </section>
  );
}

function Trips({ data, updateData }: { data: LogbookData; updateData: (updater: (current: LogbookData) => LogbookData) => void }) {
  const [form, setForm] = useState<Trip>(blankTrip(data.vehicles[0]?.id ?? "", data.drivers[0]?.name ?? ""));
  const [repeat, setRepeat] = useState<RepeatSettings>({ enabled: false, frequency: "weekly", count: 2 });
  const [returnTrip, setReturnTrip] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("vše");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const vehicles = new Map(data.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const isEditing = data.trips.some((trip) => trip.id === form.id);
  const formIssues = validateTrip(form, { ...data, trips: data.trips.filter((trip) => trip.id !== form.id) });

  useEffect(() => {
    if (!form.driver && data.drivers[0]?.name) setForm((current) => ({ ...current, driver: data.drivers[0].name }));
  }, [data.drivers, form.driver]);

  const filtered = data.trips.filter((trip) => {
    const text = `${trip.date} ${trip.driver} ${trip.from} ${trip.to} ${trip.purpose} ${vehicleName(vehicles.get(trip.vehicleId))}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (type === "vše" || trip.type === type) && (!dateFrom || trip.date >= dateFrom) && (!dateTo || trip.date <= dateTo);
  });
  const save = () => {
    if (formIssues.some((issue) => issue.severity === "error")) return alert("Jízdu nelze uložit, opravte povinná pole a tachometr.");
    const baseTrips = !isEditing && repeat.enabled ? repeatedTrips(form, repeat) : [form];
    const tripsToSave = !isEditing && returnTrip ? withReturnTrips(baseTrips) : baseTrips;
    if (!isEditing && repeat.enabled && tripsToSave.length < 2) return alert("Pro opakování nastavte počet alespoň 2 jízdy.");
    const generatedErrors = collectGeneratedTripErrors(tripsToSave, data);
    if (generatedErrors.length) return alert(`Opakované jízdy nelze uložit: ${generatedErrors[0].message}`);
    updateData((current) => recalculateOdometers({ ...current, trips: current.trips.some((item) => item.id === form.id) ? current.trips.map((item) => item.id === form.id ? form : item) : [...current.trips, ...tripsToSave] }));
    setRepeat({ enabled: false, frequency: "weekly", count: 2 });
    setReturnTrip(false);
    setForm(blankTrip(data.vehicles[0]?.id ?? "", data.drivers[0]?.name ?? ""));
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
                  <Select label="Opakování" value={repeat.frequency} onChange={(frequency) => setRepeat({ ...repeat, frequency: frequency as RepeatFrequency })} options={[["daily", "denně"], ["weekly", "týdně"], ["monthly", "měsíčně"]]} />
                  <Input label="Počet jízd celkem" type="number" value={repeat.count} onChange={(count) => setRepeat({ ...repeat, count: clampRepeatCount(count) })} />
                  <label className="full"><span>Náhled opakování</span><input readOnly value={repeatPreview(form, repeat, returnTrip)} /></label>
                </>
              )}
            </>
          )}
        </div>
        <IssueList issues={formIssues} />
        <div className="actions left"><button className="primary" onClick={save}><Plus size={16} /> Uložit jízdu</button><button onClick={() => { setRepeat({ enabled: false, frequency: "weekly", count: 2 }); setReturnTrip(false); setForm(blankTrip(data.vehicles[0]?.id ?? "", data.drivers[0]?.name ?? "")); }}>Vyčistit</button></div>
      </div>
      <div className="panel">
        <div className="toolbar"><div className="search"><Search size={16} /><input placeholder="Hledat podle trasy, řidiče, účelu nebo vozidla" value={query} onChange={(event) => setQuery(event.target.value)} /></div><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} title="Datum od" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} title="Datum do" /><select value={type} onChange={(event) => setType(event.target.value)}><option>vše</option><option>služební</option><option>soukromá</option></select></div>
        <table>
          <thead><tr><th>Datum</th><th>Čas</th><th>Vozidlo</th><th>Řidič</th><th>Trasa</th><th>Tachometr konec</th><th>Typ</th><th>Km</th><th></th></tr></thead>
          <tbody>{filtered.sort((a, b) => `${b.date} ${b.departureTime}`.localeCompare(`${a.date} ${a.departureTime}`)).map((trip) => <tr key={trip.id}><td>{trip.date}</td><td>{trip.departureTime}-{trip.arrivalTime}</td><td>{vehicleName(vehicles.get(trip.vehicleId))}</td><td>{trip.driver}</td><td>{trip.from} - {trip.to}</td><td>{trip.odometerEnd}</td><td>{trip.type}</td><td>{tripKm(trip)}</td><td className="row-actions"><button onClick={() => setForm(trip)}>Upravit</button><button className="danger" onClick={() => remove(trip.id)} title="Smazat"><Trash2 size={16} /></button></td></tr>)}</tbody>
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
    const normalized = recalculateOdometers(data);
    setData(normalized);
    const result = kind === "xlsx" ? await logbookApi.exportXlsx(normalized) : await logbookApi.exportCsv(normalized);
    setMessage(result.ok ? `Export hotový: ${result.path}` : result.message ?? "Export se nezdařil.");
  };
  const importJson = async () => {
    const state = await logbookApi.importJson();
    if (!state) return;
    setData(recalculateOdometers(state.data));
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

function SettingsPanel({ data, setData, updateData, filePath, setMessage }: { data: LogbookData; setData: (data: LogbookData) => void; updateData: (updater: (current: LogbookData) => LogbookData) => void; filePath: string | null; setMessage: (message: string) => void }) {
  const backup = async () => {
    const normalized = recalculateOdometers(data);
    setData(normalized);
    const result = await logbookApi.backupNow(normalized);
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

function PlaceInput({ label, value, places, onChange }: { label: string; value: string; places: Place[]; onChange: (value: string) => void }) {
  const listId = `places-${label.toLowerCase()}`;
  const options = [...places].sort((a, b) => a.name.localeCompare(b.name, "cs-CZ"));
  return (
    <label>
      <span>{label}</span>
      <input list={listId} value={value} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>
        {options.map((place) => <option key={place.id} value={place.name} />)}
      </datalist>
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Vyberte</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}

function driverOptions(data: LogbookData, currentDriver: string): Array<[string, string]> {
  const options = data.drivers.map((driver) => [driver.name, driver.name] as [string, string]);
  if (currentDriver && !options.some(([value]) => value === currentDriver)) options.push([currentDriver, currentDriver]);
  return options;
}

function clampRepeatCount(value: string) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 2;
  return Math.min(60, Math.max(2, Math.floor(count)));
}

function repeatedTrips(source: Trip, repeat: RepeatSettings): Trip[] {
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

function withReturnTrips(trips: Trip[]): Trip[] {
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

function createReturnTrip(trip: Trip): Trip {
  const km = tripKm(trip);
  return {
    ...trip,
    id: createId(),
    departureTime: trip.arrivalTime,
    arrivalTime: addMinutesToTime(trip.arrivalTime, tripDurationMinutes(trip)),
    from: trip.to,
    to: trip.from,
    odometerStart: Number(trip.odometerEnd),
    odometerEnd: Number(trip.odometerEnd) + km
  };
}

function collectGeneratedTripErrors(trips: Trip[], data: LogbookData) {
  let acceptedTrips = [...data.trips];
  const errors = [];
  for (const trip of trips) {
    const tripErrors = validateTrip(trip, { ...data, trips: acceptedTrips }).filter((issue) => issue.severity === "error");
    if (tripErrors.length) errors.push(...tripErrors);
    acceptedTrips = [...acceptedTrips, trip];
  }
  return errors;
}

function repeatPreview(source: Trip, repeat: RepeatSettings, includeReturnTrip = false) {
  const trips = repeatedTrips(source, repeat);
  const tripCount = includeReturnTrip ? trips.length * 2 : trips.length;
  const first = trips[0]?.date ?? source.date;
  const last = trips.at(-1)?.date ?? source.date;
  const km = tripKm(source);
  return `${tripCount} jízd, ${first} až ${last}, celkem ${tripCount * km} km`;
}

function addRepeatDate(date: string, frequency: RepeatFrequency, offset: number) {
  if (frequency === "daily") return addDays(date, offset);
  if (frequency === "weekly") return addDays(date, offset * 7);
  return addMonths(date, offset);
}

function addDays(date: string, days: number) {
  const { year, month, day } = parseDate(date);
  return formatDate(new Date(year, month - 1, day + days));
}

function addMonths(date: string, months: number) {
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

function tripDurationMinutes(trip: Trip) {
  return Math.max(1, timeToMinutes(trip.arrivalTime) - timeToMinutes(trip.departureTime));
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
