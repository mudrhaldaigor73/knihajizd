import type { FileState, LogbookData, SaveResult } from "./types";

declare global {
  interface Window {
    logbook: {
      loadInitial: () => Promise<FileState>;
      newBook: () => Promise<FileState>;
      openBook: () => Promise<FileState | null>;
      save: (data: LogbookData) => Promise<SaveResult>;
      saveAs: (data: LogbookData) => Promise<SaveResult>;
      backupNow: (data: LogbookData) => Promise<SaveResult>;
      exportXlsx: (data: LogbookData) => Promise<SaveResult>;
      exportCsv: (data: LogbookData) => Promise<SaveResult>;
      importJson: () => Promise<FileState | null>;
    };
  }
}
