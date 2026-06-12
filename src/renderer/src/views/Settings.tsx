import type { LogbookData } from "../../../shared/types";
import { Input } from "../components/fields";
import { recalculateOdometers } from "../lib/data";
import { getLogbookApi } from "../lib/logbookApi";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

const logbookApi = getLogbookApi();

export function SettingsPanel({ data, setData, updateData, filePath, setMessage }: { data: LogbookData; setData: (data: LogbookData) => void; updateData: UpdateData; filePath: string | null; setMessage: (message: string) => void }) {
  const backup = async () => {
    try {
      const result = await logbookApi.backupNow(data);
      setMessage(result.ok ? `Záloha vytvořena: ${result.path}` : result.message ?? "Záloha se nezdařila.");
    } catch {
      setMessage("Záloha se nezdařila.");
    }
  };
  const recalculate = () => {
    if (!confirm("Přepsat stavy tachometru u všech jízd podle návaznosti? Ručně zadané hodnoty budou nahrazeny dopočtenými.")) return;
    setData(recalculateOdometers(data));
    setMessage("Stavy tachometru byly přepočítány podle návaznosti jízd.");
  };
  return (
    <section className="panel settings-panel">
      <h2>Nastavení</h2>
      <div className="settings-list">
        <label><span>Datový soubor</span><input value={filePath ?? "Soubor zatím nebyl uložen"} readOnly /></label>
        <label className="switch"><input type="checkbox" checked={data.settings.autoBackup} onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, autoBackup: event.target.checked } }))} /><span>Automatické zálohování před uložením</span></label>
        <Input label="Limit podezřelých km za den" type="number" value={data.settings.highKmPerDayThreshold} onChange={(highKmPerDayThreshold) => updateData((current) => ({ ...current, settings: { ...current.settings, highKmPerDayThreshold: Number(highKmPerDayThreshold) } }))} />
        <Input label="API klíč Mapy.cz — zjišťování km z trasy (klíč zdarma na developer.mapy.cz)" value={data.settings.mapyApiKey} onChange={(mapyApiKey) => updateData((current) => ({ ...current, settings: { ...current.settings, mapyApiKey } }))} />
        <button onClick={backup}>Vytvořit ruční zálohu</button>
        <button onClick={recalculate}>Přepočítat tachometry podle návaznosti</button>
      </div>
    </section>
  );
}
