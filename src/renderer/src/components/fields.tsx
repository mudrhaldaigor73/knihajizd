import type { Place } from "../../../shared/types";
import type { ValidationIssue } from "../lib/validation";

export function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <label><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Vyberte</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}

export function PlaceInput({ label, value, places, onChange }: { label: string; value: string; places: Place[]; onChange: (value: string) => void }) {
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

export function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null;
  return <div className="issues">{issues.map((issue) => <div className={issue.severity} key={issue.id}>{issue.message}</div>)}</div>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
