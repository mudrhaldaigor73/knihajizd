import { BrowserWindow, app, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backupDataFile, defaultData, ensureInitialFile, readDataFile, readSettings, writeDataFile, writeSettings } from "./storage.js";
import { exportCsv, exportXlsx } from "./exporter.js";
import type { LogbookData } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let currentFilePath: string | null = null;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    title: "Kniha jízd",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

async function loadInitial() {
  const settings = await readSettings();
  let filePath = settings.lastFilePath;
  if (!filePath) filePath = await ensureInitialFile();

  try {
    const data = await readDataFile(filePath);
    currentFilePath = filePath;
    return { path: filePath, data };
  } catch {
    const fallbackPath = await ensureInitialFile();
    const data = await readDataFile(fallbackPath);
    currentFilePath = fallbackPath;
    return { path: fallbackPath, data };
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("data:loadInitial", loadInitial);

ipcMain.handle("data:newBook", async () => {
  currentFilePath = null;
  await writeSettings({ lastFilePath: null });
  return { path: null, data: defaultData() };
});

ipcMain.handle("data:openBook", async () => {
  const result = await dialog.showOpenDialog({
    title: "Otevřít existující knihu jízd",
    filters: [{ name: "Kniha jízd JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const data = await readDataFile(filePath);
  currentFilePath = filePath;
  await writeSettings({ lastFilePath: filePath });
  return { path: filePath, data };
});

ipcMain.handle("data:save", async (_event, data: LogbookData) => {
  if (!currentFilePath) {
    return await saveAs(data);
  }
  if (data.settings.autoBackup) await backupDataFile(currentFilePath);
  await writeDataFile(currentFilePath, data);
  await writeSettings({ lastFilePath: currentFilePath });
  return { ok: true, path: currentFilePath };
});

async function saveAs(data: LogbookData) {
  const result = await dialog.showSaveDialog({
    title: "Uložit knihu jízd jako",
    defaultPath: "kniha-jizd-data.json",
    filters: [{ name: "Kniha jízd JSON", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, message: "Uložení bylo zrušeno." };
  currentFilePath = result.filePath;
  await writeDataFile(currentFilePath, data);
  await writeSettings({ lastFilePath: currentFilePath });
  return { ok: true, path: currentFilePath };
}

ipcMain.handle("data:saveAs", async (_event, data: LogbookData) => saveAs(data));

ipcMain.handle("data:backupNow", async (_event, data: LogbookData) => {
  const basePath = currentFilePath ?? path.join(app.getPath("documents"), "kniha-jizd-data.json");
  if (!currentFilePath) {
    currentFilePath = basePath;
    await writeSettings({ lastFilePath: basePath });
  }
  await writeDataFile(basePath, data);
  const backupPath = await backupDataFile(basePath);
  return { ok: true, path: backupPath ?? basePath };
});

ipcMain.handle("export:xlsx", async (_event, data: LogbookData) => {
  const result = await dialog.showSaveDialog({
    title: "Exportovat do Excelu",
    defaultPath: `kniha-jizd-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [{ name: "Excel sešit", extensions: ["xlsx"] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, message: "Export byl zrušen." };
  await exportXlsx(result.filePath, data);
  return { ok: true, path: result.filePath };
});

ipcMain.handle("export:csv", async (_event, data: LogbookData) => {
  const result = await dialog.showSaveDialog({
    title: "Exportovat CSV",
    defaultPath: `kniha-jizd-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, message: "Export byl zrušen." };
  await exportCsv(result.filePath, data);
  return { ok: true, path: result.filePath };
});

ipcMain.handle("import:json", async () => {
  const result = await dialog.showOpenDialog({
    title: "Importovat JSON knihu jízd",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const data = await readDataFile(filePath);
  return { path: filePath, data };
});
