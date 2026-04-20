"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface DashboardFilters {
  /**
   * Family filter (e.g. "Sicilian Defense"). Set when the user drills into a
   * family from the list. Independent from `selectedId` so the family chip
   * can survive clearing a specific variation.
   */
  selectedFamily: string | null;
  selectedId: string | null;
  path: string[];
  previewMoves: string[] | null;
  setSelectedFamily: (family: string | null) => void;
  setSelectedId: (id: string | null) => void;
  setPath: React.Dispatch<React.SetStateAction<string[]>>;
  setPreviewMoves: (moves: string[] | null) => void;
  /**
   * Select an opening AND set a variation path in a single tick without the
   * usual "reset path on selection change" side-effect firing.
   */
  jumpToVariation: (openingId: string, path: string[]) => void;
  /** Set just after a selection change to skip the next path-reset effect. */
  readonly skipNextPathResetRef: React.RefObject<boolean>;
  /** Clear the variation (selectedId + path + preview), keep the family. */
  clearOpening: () => void;
  /** Clear everything — family, variation, path, preview. */
  clearFamily: () => void;
  clearPath: () => void;
  clearPreview: () => void;
  reset: () => void;
}

const DashboardFiltersContext = createContext<DashboardFilters | null>(null);

export function DashboardFiltersProvider({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  /**
   * When this value changes (e.g. per scan generation), the provider clears
   * `selectedId`, `path`, and `previewMoves` so stale filters from the
   * previous scan don't leak into the new one. Initial mount is a no-op
   * because the state already starts empty.
   */
  resetKey?: unknown;
}) {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [previewMoves, setPreviewMoves] = useState<string[] | null>(null);
  const skipNextPathResetRef = useRef(false);

  // Selecting a new opening normally clears the drill path via an effect in
  // the consumer; the jumpToVariation flow needs to bypass that, so we expose
  // the ref here for both producers.
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
  }, []);

  const jumpToVariation = useCallback(
    (openingId: string, nextPath: string[]) => {
      // Only arm the skip when selectedId actually changes — otherwise the
      // [selectedId] effect doesn't fire and the flag would latch onto the
      // next, unrelated selection and eat its path reset.
      setSelectedIdState((prev) => {
        if (prev !== openingId) skipNextPathResetRef.current = true;
        return openingId;
      });
      setPath(nextPath);
      setPreviewMoves(null);
    },
    [],
  );

  const clearOpening = useCallback(() => {
    setSelectedIdState(null);
    setPath([]);
    setPreviewMoves(null);
  }, []);
  const clearFamily = useCallback(() => {
    setSelectedFamily(null);
    setSelectedIdState(null);
    setPath([]);
    setPreviewMoves(null);
  }, []);
  const clearPath = useCallback(() => setPath([]), []);
  const clearPreview = useCallback(() => setPreviewMoves(null), []);
  const reset = useCallback(() => {
    setSelectedFamily(null);
    setSelectedIdState(null);
    setPath([]);
    setPreviewMoves(null);
  }, []);

  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    reset();
  }, [resetKey, reset]);

  const value = useMemo<DashboardFilters>(
    () => ({
      selectedFamily,
      selectedId,
      path,
      previewMoves,
      setSelectedFamily,
      setSelectedId,
      setPath,
      setPreviewMoves,
      jumpToVariation,
      skipNextPathResetRef,
      clearOpening,
      clearFamily,
      clearPath,
      clearPreview,
      reset,
    }),
    [
      selectedFamily,
      selectedId,
      path,
      previewMoves,
      setSelectedId,
      jumpToVariation,
      clearOpening,
      clearFamily,
      clearPath,
      clearPreview,
      reset,
    ],
  );

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFilters {
  const ctx = useContext(DashboardFiltersContext);
  if (!ctx) {
    throw new Error(
      "useDashboardFilters must be used within a DashboardFiltersProvider",
    );
  }
  return ctx;
}
