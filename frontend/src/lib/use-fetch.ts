"use client";

import { useCallback, useEffect, useState } from "react";

interface Settled<T> {
  fetcher: () => Promise<T>;
  attempt: number;
  data?: T;
  error: string | null;
}

/**
 * Runs `fetcher` whenever its identity changes (wrap it in useCallback keyed on
 * its inputs) or `reload()` is called.
 *
 * Each result is tagged with the fetcher + attempt that produced it, so:
 * - a slow response for an old query can never overwrite a newer one, and
 * - `loading` is derived rather than set synchronously inside the effect
 *   (which the React Compiler lint rules reject as a cascading render).
 *
 * Pass `null` to skip fetching, e.g. while the session is still resolving.
 */
export function useFetch<T>(fetcher: (() => Promise<T>) | null) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    if (!fetcher) return;
    let stale = false;
    fetcher()
      .then((data) => {
        if (!stale) setSettled({ fetcher, attempt, data, error: null });
      })
      .catch((e: unknown) => {
        if (!stale) setSettled({ fetcher, attempt, error: e instanceof Error ? e.message : "Something went wrong" });
      });
    return () => {
      stale = true;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const current = settled && settled.fetcher === fetcher && settled.attempt === attempt ? settled : null;

  return {
    data: current?.data,
    error: current?.error ?? null,
    loading: fetcher != null && current == null,
    reload,
  };
}
