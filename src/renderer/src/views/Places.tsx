import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { LogbookData, Place } from "../../../shared/types";
import { Input } from "../components/fields";
import { blankPlace } from "../lib/data";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

export function Places({ data, updateData }: { data: LogbookData; updateData: UpdateData }) {
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
