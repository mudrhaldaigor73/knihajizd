import { describe, expect, it } from "vitest";
import { validateTrip } from "../src/renderer/src/lib/validation";
import { logbook, trip } from "./helpers";

const ids = (issues: ReturnType<typeof validateTrip>) => issues.map((issue) => issue.id);

describe("validateTrip", () => {
  it("hlásí chybějící povinná pole", () => {
    const data = logbook();
    const issues = validateTrip(trip({ driver: "", purpose: "", from: "" }), data);
    expect(ids(issues)).toContain("t1-driver");
    expect(ids(issues)).toContain("t1-purpose");
    expect(ids(issues)).toContain("t1-from");
  });

  it("hlásí chybu při nižším konečném tachometru", () => {
    const issues = validateTrip(trip({ odometerStart: 1100, odometerEnd: 1000 }), logbook());
    expect(ids(issues)).toContain("t1-odo");
  });

  it("hlásí chybu při shodném čase odjezdu a příjezdu", () => {
    const issues = validateTrip(trip({ departureTime: "08:00", arrivalTime: "08:00" }), logbook());
    expect(ids(issues)).toContain("t1-time");
  });

  it("povolí jízdu přes půlnoc (příjezd dřívější než odjezd)", () => {
    const issues = validateTrip(trip({ departureTime: "23:00", arrivalTime: "01:00" }), logbook());
    expect(ids(issues)).not.toContain("t1-time");
  });

  it("varuje při nenavazujícím tachometru", () => {
    const data = logbook({ trips: [trip({ id: "prev", date: "2026-05-30", odometerStart: 1000, odometerEnd: 1200 })] });
    const issues = validateTrip(trip({ id: "t2", odometerStart: 1300, odometerEnd: 1400 }), data);
    expect(ids(issues)).toContain("t2-continuity-prev");
  });

  it("nevaruje při navazujícím tachometru", () => {
    const data = logbook({ trips: [trip({ id: "prev", date: "2026-05-30", odometerStart: 1000, odometerEnd: 1200 })] });
    const issues = validateTrip(trip({ id: "t2", odometerStart: 1200, odometerEnd: 1400 }), data);
    expect(ids(issues)).not.toContain("t2-continuity-prev");
  });

  it("varuje při duplicitě jízdy", () => {
    const data = logbook({ trips: [trip({ id: "prev" })] });
    const issues = validateTrip(trip({ id: "t2", odometerStart: 1100, odometerEnd: 1200 }), data);
    expect(ids(issues)).toContain("t2-duplicate");
  });

  it("varuje při překryvu časů stejného vozidla", () => {
    const data = logbook({ trips: [trip({ id: "prev", departureTime: "08:00", arrivalTime: "10:00" })] });
    const issues = validateTrip(trip({ id: "t2", departureTime: "09:00", arrivalTime: "11:00", odometerStart: 1100, odometerEnd: 1200 }), data);
    expect(ids(issues)).toContain("t2-overlap");
  });

  it("zachytí překryv s jízdou přes půlnoc", () => {
    const data = logbook({ trips: [trip({ id: "prev", departureTime: "23:00", arrivalTime: "01:00" })] });
    const issues = validateTrip(trip({ id: "t2", departureTime: "23:30", arrivalTime: "23:45", odometerStart: 1100, odometerEnd: 1200 }), data);
    expect(ids(issues)).toContain("t2-overlap");
  });

  it("varuje při podezřele vysokých denních km", () => {
    const issues = validateTrip(trip({ odometerStart: 1000, odometerEnd: 1900 }), logbook());
    expect(ids(issues)).toContain("t1-high-km");
  });
});
