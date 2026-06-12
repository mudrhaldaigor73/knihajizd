import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FuelRecord, LogbookData } from "../../../shared/types";
import { Input, Select } from "../components/fields";
import { blankFuel, fuelTotal, vehicleName } from "../lib/data";

type UpdateData = (updater: (current: LogbookData) => LogbookData) => void;

export function Fuels({ data, updateData }: { data: LogbookData; updateData: UpdateData }) {
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
