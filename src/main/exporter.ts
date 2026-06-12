import fs from "node:fs/promises";
import { buildTripsCsv, buildWorkbook } from "../shared/exportWorkbook.js";
import type { LogbookData } from "../shared/types.js";

export async function exportXlsx(filePath: string, data: LogbookData) {
  await buildWorkbook(data).xlsx.writeFile(filePath);
}

export async function exportCsv(filePath: string, data: LogbookData) {
  await fs.writeFile(filePath, buildTripsCsv(data), "utf8");
}
