import { describe, expect, it } from "vitest";
import { addMonths, createReturnTrip, isOvernight, repeatedTrips, tripDurationMinutes, withReturnTrips } from "../src/renderer/src/lib/tripGenerators";
import { trip } from "./helpers";

describe("repeatedTrips", () => {
  it("vytvoří správný počet jízd s týdenním posunem a navazujícím tachometrem", () => {
    const trips = repeatedTrips(trip({ odometerStart: 1000, odometerEnd: 1100 }), { enabled: true, frequency: "weekly", count: 3 });
    expect(trips).toHaveLength(3);
    expect(trips.map((item) => item.date)).toEqual(["2026-06-01", "2026-06-08", "2026-06-15"]);
    expect(trips.map((item) => item.odometerStart)).toEqual([1000, 1100, 1200]);
    expect(trips.map((item) => item.odometerEnd)).toEqual([1100, 1200, 1300]);
  });
});

describe("withReturnTrips", () => {
  it("za každou jízdu vloží zpáteční s prohozenou trasou a navazujícím tachometrem", () => {
    const result = withReturnTrips([trip({ odometerStart: 1000, odometerEnd: 1100 })]);
    expect(result).toHaveLength(2);
    const [outbound, inbound] = result;
    expect(inbound.from).toBe(outbound.to);
    expect(inbound.to).toBe(outbound.from);
    expect(inbound.odometerStart).toBe(1100);
    expect(inbound.odometerEnd).toBe(1200);
    expect(inbound.departureTime).toBe(outbound.arrivalTime);
  });
});

describe("createReturnTrip", () => {
  it("zpáteční jízda po jízdě přes půlnoc má datum dalšího dne", () => {
    const overnight = trip({ departureTime: "23:00", arrivalTime: "01:00" });
    const inbound = createReturnTrip(overnight);
    expect(inbound.date).toBe("2026-06-02");
    expect(inbound.departureTime).toBe("01:00");
    expect(inbound.arrivalTime).toBe("03:00");
  });
});

describe("tripDurationMinutes", () => {
  it("počítá délku jízdy přes půlnoc", () => {
    expect(tripDurationMinutes({ departureTime: "23:00", arrivalTime: "01:30" })).toBe(150);
  });

  it("počítá běžnou délku jízdy", () => {
    expect(tripDurationMinutes({ departureTime: "08:00", arrivalTime: "09:15" })).toBe(75);
  });
});

describe("isOvernight", () => {
  it("rozpozná jízdu přes půlnoc", () => {
    expect(isOvernight({ departureTime: "23:00", arrivalTime: "01:00" })).toBe(true);
    expect(isOvernight({ departureTime: "08:00", arrivalTime: "09:00" })).toBe(false);
  });
});

describe("addMonths", () => {
  it("zarovná konec měsíce", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("přechází přes konec roku", () => {
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
  });
});
