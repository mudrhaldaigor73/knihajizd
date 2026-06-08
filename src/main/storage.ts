import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type { LogbookData } from "../shared/types.js";

export const defaultData = (): LogbookData => ({
  version: 1,
  vehicles: [],
  drivers: [],
  places: [],
  trips: [],
  fuels: [],
  settings: {
    highKmPerDayThreshold: 800,
    autoBackup: true,
    theme: "light"
  }
});

function createId() {
  return `${Date.now()}-${Math.random()}`;
}

function normalizeData(parsed: Partial<LogbookData>): LogbookData {
  const defaults = defaultData();
  const inferredDrivers = [...new Set((parsed.trips ?? []).map((trip) => trip.driver).filter(Boolean))].slice(0, 3);
  const inferredPlaces = [...new Set((parsed.trips ?? []).flatMap((trip) => [trip.from, trip.to]).filter(Boolean))];
  return {
    ...defaults,
    ...parsed,
    drivers: parsed.drivers ?? inferredDrivers.map((name) => ({ id: createId(), name, note: "" })),
    places: parsed.places ?? inferredPlaces.map((name) => ({ id: createId(), name, note: "" })),
    settings: { ...defaults.settings, ...parsed.settings }
  };
}

const settingsPath = () => path.join(app.getPath("userData"), "settings.json");

export async function readSettings(): Promise<{ lastFilePath: string | null }> {
  try {
    return JSON.parse(await fs.readFile(settingsPath(), "utf8"));
  } catch {
    return { lastFilePath: null };
  }
}

export async function writeSettings(settings: { lastFilePath: string | null }) {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

export async function readDataFile(filePath: string): Promise<LogbookData> {
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as Partial<LogbookData>;
  return normalizeData(parsed);
}

export async function writeDataFile(filePath: string, data: LogbookData) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function backupDataFile(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const backupsDir = path.join(path.dirname(filePath), "zalohy-knihy-jizd");
  await fs.mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `kniha-jizd-${stamp}.json`);
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

export async function ensureInitialFile(): Promise<string> {
  const defaultPath = path.join(app.getPath("documents"), "kniha-jizd-data.json");
  try {
    await fs.access(defaultPath);
  } catch {
    await writeDataFile(defaultPath, defaultData());
  }
  await writeSettings({ lastFilePath: defaultPath });
  return defaultPath;
}
