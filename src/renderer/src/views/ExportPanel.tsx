import { Download, Printer, Upload } from "lucide-react";
import type { LogbookData } from "../../../shared/types";
import { PrintReport } from "../components/PrintReport";
import { getLogbookApi } from "../lib/logbookApi";

const logbookApi = getLogbookApi();

export function ExportPanel({ data, setData, setMessage }: { data: LogbookData; setData: (data: LogbookData) => void; setMessage: (message: string) => void }) {
  const run = async (kind: "xlsx" | "csv") => {
    try {
      const result = kind === "xlsx" ? await logbookApi.exportXlsx(data) : await logbookApi.exportCsv(data);
      setMessage(result.ok ? `Export hotový: ${result.path}` : result.message ?? "Export se nezdařil.");
    } catch {
      setMessage("Export se nezdařil.");
    }
  };
  const importJson = async () => {
    try {
      const state = await logbookApi.importJson();
      if (!state) return;
      setData(state.data);
      setMessage(`Importováno: ${state.path}`);
    } catch {
      setMessage("Import se nezdařil. Zkontrolujte, že jde o platný JSON knihy jízd.");
    }
  };
  return (
    <>
      <section className="panel export-panel">
        <h2>Export a import</h2>
        <p>Excel export obsahuje listy Kniha jízd, Tankování, Měsíční souhrn, Roční souhrn a Vozidla včetně českých hlaviček, filtrů, zmrazené hlavičky a součtů. Tisk vytvoří přehled jízd se souhrny vhodný pro účetnictví.</p>
        <div className="export-actions">
          <button className="primary" onClick={() => run("xlsx")}><Download size={18} /> Exportovat .xlsx</button>
          <button onClick={() => run("csv")}><Download size={18} /> Exportovat CSV</button>
          <button onClick={() => window.print()}><Printer size={18} /> Tisknout</button>
          <button onClick={importJson}><Upload size={18} /> Importovat JSON</button>
        </div>
      </section>
      <PrintReport data={data} />
    </>
  );
}
