import { contextBridge, ipcRenderer } from "electron";
import type { FileState, LogbookData, SaveResult } from "../shared/types.js";

const api = {
  loadInitial: (): Promise<FileState> => ipcRenderer.invoke("data:loadInitial"),
  newBook: (): Promise<FileState> => ipcRenderer.invoke("data:newBook"),
  openBook: (): Promise<FileState | null> => ipcRenderer.invoke("data:openBook"),
  save: (data: LogbookData): Promise<SaveResult> => ipcRenderer.invoke("data:save", data),
  saveAs: (data: LogbookData): Promise<SaveResult> => ipcRenderer.invoke("data:saveAs", data),
  backupNow: (data: LogbookData): Promise<SaveResult> => ipcRenderer.invoke("data:backupNow", data),
  exportXlsx: (data: LogbookData): Promise<SaveResult> => ipcRenderer.invoke("export:xlsx", data),
  exportCsv: (data: LogbookData): Promise<SaveResult> => ipcRenderer.invoke("export:csv", data),
  importJson: (): Promise<FileState | null> => ipcRenderer.invoke("import:json")
};

contextBridge.exposeInMainWorld("logbook", api);

export type LogbookApi = typeof api;
