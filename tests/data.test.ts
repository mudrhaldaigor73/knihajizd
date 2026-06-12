import { describe, expect, it } from "vitest";
import { autoFillOdometerStart, getLastOdometer, recalculateOdometers, recalculateOdometersAfter } from "../src/renderer/src/lib/data";
import { logbook, trip, vehicle } from "./helpers";

describe("autoFillOdometerStart", () => {
  it("doplní počáteční tachometr z předchozí jízdy", () => {
    const data = logbook({ trips: [trip({ id: "prev", date: "2026-05-30", odometerEnd: 1250 })] });
    const filled = autoFillOdometerStart(trip({ id: "t2", odometerStart: 0, odometerEnd: 1400 }), data);
    expect(filled.odometerStart).toBe(1250);
    expect(filled.odometerEnd).toBe(1400);
  });

  it("bez předchozí jízdy doplní počáteční stav vozidla", () => {
    const data = logbook({ vehicles: [vehicle({ initialOdometer: 5000 })] });
    const filled = autoFillOdometerStart(trip({ odometerStart: 0, odometerEnd: 5100 }), data);
    expect(filled.odometerStart).toBe(5000);
  });

  it("nezasahuje do ručně zadané hodnoty", () => {
    const data = logbook({ trips: [trip({ id: "prev", date: "2026-05-30", odometerEnd: 1250 })] });
    const filled = autoFillOdometerStart(trip({ id: "t2", odometerStart: 1300, odometerEnd: 1400 }), data);
    expect(filled.odometerStart).toBe(1300);
  });
});

describe("recalculateOdometers", () => {
  it("přepočítá tachometry chronologicky od počátečního stavu vozidla", () => {
    const data = logbook({
      vehicles: [vehicle({ initialOdometer: 1000 })],
      trips: [
        trip({ id: "b", date: "2026-06-02", odometerStart: 9999, odometerEnd: 10100 }),
        trip({ id: "a", date: "2026-06-01", odometerStart: 5, odometerEnd: 155 })
      ]
    });
    const result = recalculateOdometers(data);
    const a = result.trips.find((item) => item.id === "a")!;
    const b = result.trips.find((item) => item.id === "b")!;
    expect(a.odometerStart).toBe(1000);
    expect(a.odometerEnd).toBe(1150);
    expect(b.odometerStart).toBe(1150);
    expect(b.odometerEnd).toBe(1251);
  });
});

describe("recalculateOdometersAfter", () => {
  it("posune tachometry jízd následujících po zpětně vložené jízdě", () => {
    const data = logbook({
      trips: [
        trip({ id: "a", date: "2026-06-01", odometerStart: 1000, odometerEnd: 1100 }),
        trip({ id: "c", date: "2026-06-03", odometerStart: 1100, odometerEnd: 1300 }),
        trip({ id: "b", date: "2026-06-02", odometerStart: 1100, odometerEnd: 1150 })
      ]
    });
    const result = recalculateOdometersAfter(data, data.trips[2]);
    const a = result.trips.find((item) => item.id === "a")!;
    const c = result.trips.find((item) => item.id === "c")!;
    expect(a.odometerStart).toBe(1000);
    expect(a.odometerEnd).toBe(1100);
    expect(c.odometerStart).toBe(1150);
    expect(c.odometerEnd).toBe(1350);
  });

  it("nemění jízdy jiných vozidel", () => {
    const data = logbook({
      trips: [
        trip({ id: "b", date: "2026-06-02", odometerStart: 1100, odometerEnd: 1150 }),
        trip({ id: "x", vehicleId: "v2", date: "2026-06-03", odometerStart: 500, odometerEnd: 600 })
      ]
    });
    const result = recalculateOdometersAfter(data, data.trips[0]);
    const x = result.trips.find((item) => item.id === "x")!;
    expect(x.odometerStart).toBe(500);
    expect(x.odometerEnd).toBe(600);
  });

  it("vrací data beze změny, když jízdy navazují", () => {
    const data = logbook({
      trips: [
        trip({ id: "a", date: "2026-06-01", odometerStart: 1000, odometerEnd: 1100 }),
        trip({ id: "b", date: "2026-06-02", odometerStart: 1100, odometerEnd: 1150 })
      ]
    });
    expect(recalculateOdometersAfter(data, data.trips[0])).toBe(data);
  });
});

describe("getLastOdometer", () => {
  it("vrací nejvyšší konečný stav jízd vozidla", () => {
    const data = logbook({ trips: [trip({ odometerEnd: 1500 }), trip({ id: "t2", odometerEnd: 1700 })] });
    expect(getLastOdometer(data, "v1")).toBe(1700);
  });

  it("bez jízd vrací počáteční stav vozidla", () => {
    const data = logbook({ vehicles: [vehicle({ initialOdometer: 4321 })] });
    expect(getLastOdometer(data, "v1")).toBe(4321);
  });
});
