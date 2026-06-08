import type { LogbookApi } from "./lib/logbookApi";

declare global {
  interface FileSystemWritableFileStream {
    write: (data: BlobPart) => Promise<void>;
    close: () => Promise<void>;
  }

  interface FileSystemFileHandle {
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }

  interface Window {
    logbook?: LogbookApi;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}
