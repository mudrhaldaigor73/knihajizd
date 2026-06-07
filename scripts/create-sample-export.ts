import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportXlsx } from "../src/main/exporter.js";
import type { LogbookData } from "../src/shared/types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "sample-data", "kniha-jizd-data.json");
const exportPath = path.join(root, "sample-data", "ukazkovy-export.xlsx");

const data = JSON.parse(await fs.readFile(dataPath, "utf8")) as LogbookData;
await exportXlsx(exportPath, data);
console.log(`Ukázkový export vytvořen: ${exportPath}`);
