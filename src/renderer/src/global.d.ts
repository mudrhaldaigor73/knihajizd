import type { LogbookApi } from "./lib/logbookApi";

declare global {
  interface Window {
    logbook?: LogbookApi;
  }
}
