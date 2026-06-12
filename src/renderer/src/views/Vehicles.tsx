import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { LogbookData, Vehicle } from "../../../shared/types";
import { Input } from "../components/fields";
import { blankVehicle, vehicleName } from "../lib/data";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

export function Vehicles({ data, updateData }: { data: LogbookData; updateData: UpdateData }) {
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
