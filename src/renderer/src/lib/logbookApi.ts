import type { FileState, LogbookData, SaveResult } from "../types";
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
}

const storageKey = "moje-kniha-jizd:data";
const savedName = "Úložiště prohlížeče";

function normalize(data: Partial<LogbookData>): LogbookData {
  const defaults = emptyData();
  return {
    ...defaults,
    ...data,
    vehicles: data.vehicles ?? [],
    trips: data.trips ?? [],
    fuels: data.fuels ?? [],
    settings: { ...defaults.settings, ...data.settings }
  };
}

function readBrowserData(): LogbookData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return emptyData();
  return normalize(JSON.parse(raw) as Partial<LogbookData>);
}

function writeBrowserData(data: LogbookData) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function pickJsonFile(): Promise<FileState | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const data = normalize(JSON.parse(await file.text()) as Partial<LogbookData>);
        writeBrowserData(data);
        resolve({ path: file.name, data });
      } catch {
        resolve(null);
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
    writeBrowserData(data);
    return { ok: true, path: savedName };
  },
  async saveAs(data) {
    writeBrowserData(data);
    downloadJson(data);
    return { ok: true, path: "kniha-jizd-data.json" };
  },
  async backupNow(data) {
    writeBrowserData(data);
    const filename = `kniha-jizd-zaloha-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    downloadJson(data, filename);
    return { ok: true, path: filename };
  },
  async exportXlsx(data) {
    await downloadXlsx(data);
    return { ok: true, path: "stažený Excel soubor" };
  },
  async exportCsv(data) {
    downloadCsv(data);
    return { ok: true, path: "stažený CSV soubor" };
  },
  importJson: pickJsonFile
};

export function getLogbookApi(): LogbookApi {
  return window.logbook ?? browserApi;
}
