import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../api/client";

/** Runs an async fetcher whenever deps change. Ignores out-of-date responses. */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (id === latest.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === latest.current) setState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
