import { Car, Download, Fuel, Gauge, LayoutDashboard, LogOut, MapPin, Moon, Save, Settings, Sun, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LogbookData } from "../../shared/types";
import { emptyData, summary } from "./lib/data";
import { validateAllTrips } from "./lib/validation";
import { getLogbookApi } from "./lib/logbookApi";
import { isAuthenticated, signOut } from "./lib/auth";
import { LoginScreen } from "./views/Login";
import { Dashboard } from "./views/Dashboard";
import { Vehicles } from "./views/Vehicles";
import { Drivers } from "./views/Drivers";
import { Places } from "./views/Places";
import { Trips } from "./views/Trips";
import { Fuels } from "./views/Fuels";
import { ExportPanel } from "./views/ExportPanel";
import { SettingsPanel } from "./views/Settings";

type View = "dashboard" | "vehicles" | "drivers" | "places" | "trips" | "fuels" | "export" | "settings";

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
const hasAutoPersist = Boolean(logbookApi.autoPersist);

export function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [data, setDataState] = useState<LogbookData>(emptyData());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);
  const stats = useMemo(() => summary(data), [data]);
  const issues = useMemo(() => validateAllTrips(data), [data]);

  const applyData = (next: LogbookData, markDirty = true) => {
    setDataState(next);
    setDirty(markDirty);
  };
  const updateData = (updater: (current: LogbookData) => LogbookData) => {
    setDataState((current) => updater(current));
    setDirty(true);
  };

  useEffect(() => {
    void logbookApi
      .loadInitial()
      .then((state) => {
        setDataState(state.data);
        setFilePath(state.path);
        document.documentElement.dataset.theme = state.data.settings.theme;
        loadedRef.current = true;
      })
      .catch(() => setMessage("Načtení dat se nezdařilo. Zkuste knihu otevřít ručně přes Otevřít."));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  // Ve webové verzi se každá změna ihned ukládá do prohlížeče, aby reload
  // nezahodil rozpracovaná data; tlačítko Uložit dál stahuje JSON soubor.
  useEffect(() => {
    if (!loadedRef.current) return;
    logbookApi.autoPersist?.(data);
  }, [data]);

  async function save() {
    try {
      const result = await logbookApi.save(data);
      setMessage(result.ok ? `Uloženo: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
      if (result.ok) {
        setDirty(false);
        if (result.path) setFilePath(result.path);
      }
    } catch {
      setMessage("Uložení se nezdařilo.");
    }
  }

  async function saveAs() {
    try {
      const result = await logbookApi.saveAs(data);
      setMessage(result.ok ? `Uloženo jako: ${result.path}` : result.message ?? "Uložení se nezdařilo.");
      if (result.ok) {
        setDirty(false);
        if (result.path) setFilePath(result.path);
      }
    } catch {
      setMessage("Uložení se nezdařilo.");
    }
  }

  async function openBook() {
    try {
      const state = await logbookApi.openBook();
      if (!state) return;
      applyData(state.data, false);
      setFilePath(state.path);
      setMessage(`Otevřeno: ${state.path}`);
    } catch {
      setMessage("Soubor se nepodařilo načíst. Zkontrolujte, že jde o platný JSON knihy jízd.");
    }
  }

  async function newBook() {
    if (!confirm("Opravdu vytvořit novou prázdnou knihu jízd? Neuložené změny budou ztraceny.")) return;
    const state = await logbookApi.newBook();
    applyData(state.data, false);
    setFilePath(state.path);
    setMessage("Vytvořena nová kniha jízd.");
  }

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
            <p>{filePath ?? "Nová kniha zatím není uložená"}{dirty && !hasAutoPersist ? " • neuloženo" : ""}</p>
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
        {view === "export" && <ExportPanel data={data} setData={applyData} setMessage={setMessage} />}
        {view === "settings" && <SettingsPanel data={data} setData={applyData} updateData={updateData} filePath={filePath} setMessage={setMessage} />}
      </main>
    </div>
  );
}
