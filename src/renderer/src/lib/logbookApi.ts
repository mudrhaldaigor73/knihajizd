import { parseLogbookData } from "../../../shared/parseLogbook";
import type { FileState, LogbookData, SaveResult } from "../../../shared/types";
import { emptyData } from "./data";
import { downloadCsv, downloadJson, downloadXlsx } from "./browserExport";

export interface LogbookApi {
  loadInitial: () => Promise<FileState>;
  newBook: () => Promise<FileState>;
  openBook: () => Promise<FileState | null>;
  save: (data: LogbookData) => Promise<SaveResult>;
  saveAs: (data: LogbookData) => Promise<SaveResult>;
  backupNow: (data: LogbookData) => Promise<SaveResult>;
  exportXlsx: (data: LogbookData) => Promise<SaveResult>;
  exportCsv: (data: LogbookData) => Promise<SaveResult>;
  importJson: () => Promise<FileState | null>;
  /** Průběžné ukládání při každé změně (jen webová verze — localStorage). */
  autoPersist?: (data: LogbookData) => void;
}

const storageKey = "moje-kniha-jizd:data";
const savedName = "Úložiště prohlížeče";
const defaultJsonName = "kniha-jizd-data.json";

function readBrowserData(): LogbookData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return emptyData();
  try {
    return parseLogbookData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

const storageFullMessage = "Data se nepodařilo uložit do prohlížeče (úložiště je plné nebo blokované). Stáhněte si JSON zálohu, ať o data nepřijdete.";

function writeBrowserData(data: LogbookData): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function jsonBlob(data: LogbookData) {
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
}

async function saveJsonWithPicker(data: LogbookData, suggestedName = defaultJsonName): Promise<SaveResult> {
  if (!window.showSaveFilePicker) {
    downloadJson(data, suggestedName);
    return { ok: true, path: suggestedName };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: "Kniha jízd JSON", accept: { "application/json": [".json"] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(jsonBlob(data));
    await writable.close();
    return { ok: true, path: suggestedName };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { ok: false, message: "Uložení bylo zrušeno." };
    downloadJson(data, suggestedName);
    return { ok: true, path: suggestedName };
  }
}

function pickJsonFile(): Promise<FileState | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const data = parseLogbookData(JSON.parse(await file.text()));
        writeBrowserData(data);
        resolve({ path: file.name, data });
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

const browserApi: LogbookApi = {
  async loadInitial() {
    return { path: savedName, data: readBrowserData() };
  },
  async newBook() {
    const data = emptyData();
    writeBrowserData(data);
    return { path: savedName, data };
  },
  openBook: pickJsonFile,
  async save(data) {
    const stored = writeBrowserData(data);
    downloadJson(data, defaultJsonName);
    return stored ? { ok: true, path: defaultJsonName } : { ok: false, message: storageFullMessage };
  },
  async saveAs(data) {
    const stored = writeBrowserData(data);
    const result = await saveJsonWithPicker(data);
    return stored ? result : { ok: false, message: storageFullMessage };
  },
  async backupNow(data) {
    const stored = writeBrowserData(data);
    const filename = `kniha-jizd-zaloha-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    downloadJson(data, filename);
    return stored ? { ok: true, path: filename } : { ok: false, message: storageFullMessage };
  },
  async exportXlsx(data) {
    await downloadXlsx(data);
    return { ok: true, path: "stažený Excel soubor" };
  },
  async exportCsv(data) {
    downloadCsv(data);
    return { ok: true, path: "stažený CSV soubor" };
  },
  importJson: pickJsonFile,
  autoPersist: (data) => {
    writeBrowserData(data);
  }
};

export function getLogbookApi(): LogbookApi {
  return window.logbook ?? browserApi;
}
