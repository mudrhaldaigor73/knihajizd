import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Driver, LogbookData } from "../../../shared/types";
import { Input } from "../components/fields";
import { blankDriver } from "../lib/data";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

export function Drivers({ data, updateData }: { data: LogbookData; updateData: UpdateData }) {
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
