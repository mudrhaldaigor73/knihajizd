import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRouteCache, geocodePlace, getRouteKm, routeCacheKey } from "../src/renderer/src/lib/routing";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const geocodeBody = (lon: number, lat: number) => ({ items: [{ position: { lon, lat } }] });

beforeEach(() => clearRouteCache());
afterEach(() => vi.unstubAllGlobals());

describe("routeCacheKey", () => {
  it("normalizuje velikost písmen a mezery", () => {
    expect(routeCacheKey("  Brno ", "PRAHA")).toBe(routeCacheKey("brno", "praha"));
  });

  it("rozlišuje směr trasy", () => {
    expect(routeCacheKey("Brno", "Praha")).not.toBe(routeCacheKey("Praha", "Brno"));
  });
});

describe("geocodePlace", () => {
  it("vrátí souřadnice prvního výsledku", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(geocodeBody(16.6, 49.19))));
    await expect(geocodePlace("Brno", "klic")).resolves.toEqual({ lon: 16.6, lat: 49.19 });
  });

  it("ohlásí nenalezené místo česky", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    await expect(geocodePlace("Neexistov", "klic")).rejects.toThrow('Místo "Neexistov" se nepodařilo najít');
  });

  it("ohlásí neplatný API klíč", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));
    await expect(geocodePlace("Brno", "spatny")).rejects.toThrow("Mapy.cz odmítly API klíč");
  });
});

describe("getRouteKm", () => {
  it("geokóduje obě místa, naplánuje trasu a zaokrouhlí km", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.includes("/geocode")
          ? jsonResponse(url.includes("Brno") ? geocodeBody(16.6, 49.19) : geocodeBody(14.42, 50.08))
          : jsonResponse({ length: 205_400 })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getRouteKm("Brno", "Praha", "klic")).resolves.toBe(205);
    const routingCall = fetchMock.mock.calls.map(([url]) => url).find((url) => url.includes("/routing/route"))!;
    expect(routingCall).toContain("start=16.6,49.19");
    expect(routingCall).toContain("end=14.42,50.08");
    expect(routingCall).toContain("routeType=car_fast");
  });

  it("druhý dotaz na stejnou trasu obslouží z keše bez fetch", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url.includes("/geocode") ? jsonResponse(geocodeBody(16.6, 49.19)) : jsonResponse({ length: 12_000 }))
    );
    vi.stubGlobal("fetch", fetchMock);
    await getRouteKm("Brno", "Blansko", "klic");
    const callsAfterFirst = fetchMock.mock.calls.length;
    await expect(getRouteKm(" brno ", "BLANSKO", "klic")).resolves.toBe(12);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it("bez vyplněných míst skončí chybou bez volání API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getRouteKm("", "Praha", "klic")).rejects.toThrow("Vyplňte místo odjezdu i příjezdu.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ohlásí nenaplánovatelnou trasu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(url.includes("/geocode") ? jsonResponse(geocodeBody(16.6, 49.19)) : jsonResponse({})))
    );
    await expect(getRouteKm("Brno", "Praha", "klic")).rejects.toThrow("se nepodařilo naplánovat");
  });
});
