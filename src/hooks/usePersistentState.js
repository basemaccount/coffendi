import { useCallback, useEffect, useRef, useState } from "react";

export function usePersistentState(key, initialValue) {
  const initialValueRef = useRef(initialValue);
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return {
        value: stored ? JSON.parse(stored) : initialValue,
        serialized: stored ?? JSON.stringify(initialValue),
      };
    } catch {
      return {
        value: initialValue,
        serialized: JSON.stringify(initialValue),
      };
    }
  });
  const storedValueRef = useRef(state.serialized);
  const value = state.value;
  const setValue = useCallback((nextValue) => {
    setState((current) => ({
      ...current,
      value: typeof nextValue === "function" ? nextValue(current.value) : nextValue,
    }));
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === storedValueRef.current) return;
    storedValueRef.current = serialized;
    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      // The experience still works when storage is unavailable or full.
    }
  }, [key, value]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key !== key) return;
      const serialized = event.newValue ?? JSON.stringify(initialValueRef.current);
      if (serialized === storedValueRef.current) return;
      try {
        const nextValue = event.newValue === null ? initialValueRef.current : JSON.parse(serialized);
        storedValueRef.current = serialized;
        setState((current) => ({ ...current, value: nextValue }));
      } catch {
        // Ignore malformed values written outside this application.
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, [key]);

  return [value, setValue];
}
