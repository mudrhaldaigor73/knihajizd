import { describe, expect, it } from "vitest";
import { buildTripsCsv, buildWorkbook } from "../src/shared/exportWorkbook";
import { fuel, logbook, trip } from "./helpers";

const formulaOf = (value: unknown) => (value as { formula?: string })?.formula;

describe("buildWorkbook", () => {
  it("součet km pokrývá všechny jízdy včetně poslední", () => {
    const data = logbook({ trips: [trip(), trip({ id: "t2", date: "2026-06-02", odometerStart: 1100, odometerEnd: 1200 }), trip({ id: "t3", date: "2026-06-03", odometerStart: 1200, odometerEnd: 1300 })] });
    const sheet = buildWorkbook(data).getWorksheet("Kniha jízd")!;
    expect(formulaOf(sheet.getRow(sheet.rowCount).getCell(13).value)).toBe("SUM(M2:M4)");
  });

  it("součet tankování pokrývá všechny záznamy a prázdný list nemá rozbitý rozsah", () => {
    const withFuels = buildWorkbook(logbook({ fuels: [fuel(), fuel({ id: "f2" })] })).getWorksheet("Tankování")!;
    expect(formulaOf(withFuels.getRow(withFuels.rowCount).getCell(7).value)).toBe("SUM(G2:G3)");
    const empty = buildWorkbook(logbook()).getWorksheet("Tankování")!;
    expect(formulaOf(empty.getRow(empty.rowCount).getCell(7).value)).toBe("SUM(G2:G2)");
  });

  it("obsahuje všech pět listů", () => {
    const workbook = buildWorkbook(logbook());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Kniha jízd", "Tankování", "Měsíční souhrn", "Roční souhrn", "Vozidla"]);
  });
});

describe("buildTripsCsv", () => {
  it("začíná BOM a používá CRLF", () => {
    const csv = buildTripsCsv(logbook({ trips: [trip()] }));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("escapuje uvozovky v hodnotách", () => {
    const csv = buildTripsCsv(logbook({ trips: [trip({ purpose: 'jednání "U lva"' })] }));
    expect(csv).toContain('"jednání ""U lva"""');
  });
});
