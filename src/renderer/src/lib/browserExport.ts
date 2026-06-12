import { buildTripsCsv, buildWorkbook } from "../../../shared/exportWorkbook";
import type { LogbookData } from "../../../shared/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: LogbookData, filename = "kniha-jizd-data.json") {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }), filename);
}

export function downloadCsv(data: LogbookData, filename = `kniha-jizd-${new Date().toISOString().slice(0, 10)}.csv`) {
  downloadBlob(new Blob([buildTripsCsv(data)], { type: "text/csv;charset=utf-8" }), filename);
}

export async function downloadXlsx(data: LogbookData, filename = `kniha-jizd-export-${new Date().toISOString().slice(0, 10)}.xlsx`) {
  const buffer = await buildWorkbook(data).xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
