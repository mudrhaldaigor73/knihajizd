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
const defaultJsonName = "kniha-jizd-data.json";

const createBrowserId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function normalize(data: Partial<LogbookData>): LogbookData {
  const defaults = emptyData();
  return {
    ...defaults,
    ...data,
    vehicles: data.vehicles ?? [],
    drivers: data.drivers ?? [],
    places: data.places ?? [...new Set((data.trips ?? []).flatMap((trip) => [trip.from, trip.to]).filter(Boolean))].map((name) => ({ id: createBrowserId(), name, note: "" })),
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
    downloadJson(data, defaultJsonName);
    return { ok: true, path: defaultJsonName };
  },
  async saveAs(data) {
    writeBrowserData(data);
    return await saveJsonWithPicker(data);
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
