import { renderHook, act } from "@testing-library/react";
import { useSaveInFlight } from "../useSaveInFlight";

describe("useSaveInFlight", () => {
  it("renders saving=true before false even when the save settled before React rendered", async () => {
    const seen: boolean[] = [];
    const { result } = renderHook(() => {
      const r = useSaveInFlight();
      seen.push(r.saving);
      return r;
    });

    await act(async () => {
      result.current.track(Promise.resolve());
    });

    expect(seen).toContain(true);
    expect(seen[seen.length - 1]).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it("stays true until a slow save settles", async () => {
    let resolve!: () => void;
    const { result } = renderHook(() => useSaveInFlight());

    act(() => {
      result.current.track(new Promise<void>((r) => { resolve = r; }));
    });
    expect(result.current.saving).toBe(true);

    await act(async () => { resolve(); });
    expect(result.current.saving).toBe(false);
  });

  it("ends in false when the save rejects", async () => {
    const { result } = renderHook(() => useSaveInFlight());
    const failing = Promise.reject(new Error("refused"));
    failing.catch(() => {});

    await act(async () => {
      result.current.track(failing);
    });

    expect(result.current.saving).toBe(false);
  });

  it("stays true until every overlapping save settles", async () => {
    let first!: () => void;
    let second!: () => void;
    const { result } = renderHook(() => useSaveInFlight());

    act(() => { result.current.track(new Promise<void>((r) => { first = r; })); });
    act(() => { result.current.track(new Promise<void>((r) => { second = r; })); });

    await act(async () => { first(); });
    expect(result.current.saving).toBe(true);

    await act(async () => { second(); });
    expect(result.current.saving).toBe(false);
  });
});
