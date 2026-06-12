import { describe, expect, it } from "vitest";
import { parseLogbookData } from "../src/shared/parseLogbook";
import { logbook, trip } from "./helpers";

describe("parseLogbookData", () => {
  it("projde platná data beze změny obsahu", () => {
    const data = logbook({ trips: [trip()] });
    const parsed = parseLogbookData(JSON.parse(JSON.stringify(data)));
    expect(parsed.trips).toHaveLength(1);
    expect(parsed.trips[0].odometerEnd).toBe(1100);
    expect(parsed.vehicles[0].spz).toBe("1AB 2345");
  });

  it("odmítne vstup, který není objekt", () => {
    expect(() => parseLogbookData("text")).toThrow(/JSON objekt/);
    expect(() => parseLogbookData([1, 2])).toThrow(/JSON objekt/);
    expect(() => parseLogbookData(null)).toThrow(/JSON objekt/);
  });

  it("odmítne kolekci, která není seznam", () => {
    expect(() => parseLogbookData({ trips: "ne" })).toThrow(/musí být seznam/);
  });

  it("odmítne záznam, který není objekt", () => {
    expect(() => parseLogbookData({ trips: [42] })).toThrow(/není objekt/);
  });

  it("koerce číselných polí ze stringů", () => {
    const parsed = parseLogbookData({ trips: [{ ...trip(), odometerStart: "100", odometerEnd: "250" }] });
    expect(parsed.trips[0].odometerStart).toBe(100);
    expect(parsed.trips[0].odometerEnd).toBe(250);
  });

  it("odvodí řidiče a místa z jízd, když chybí", () => {
    const parsed = parseLogbookData({ trips: [trip({ driver: "Petr", from: "Brno", to: "Olomouc" })] });
    expect(parsed.drivers.map((driver) => driver.name)).toEqual(["Petr"]);
    expect(parsed.places.map((place) => place.name).sort()).toEqual(["Brno", "Olomouc"]);
  });

  it("neořezává odvozené řidiče na tři", () => {
    const trips = ["A", "B", "C", "D", "E"].map((driver, index) => trip({ id: `t${index}`, driver }));
    const parsed = parseLogbookData({ trips });
    expect(parsed.drivers).toHaveLength(5);
  });

  it("doplní výchozí nastavení", () => {
    const parsed = parseLogbookData({});
    expect(parsed.settings.highKmPerDayThreshold).toBe(800);
    expect(parsed.settings.autoBackup).toBe(true);
    expect(parsed.settings.theme).toBe("light");
  });

  it("doplní chybějící id záznamů", () => {
    const parsed = parseLogbookData({ trips: [{ ...trip(), id: undefined }] });
    expect(parsed.trips[0].id).toBeTruthy();
  });
});
