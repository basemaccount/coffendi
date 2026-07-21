import { useEffect, useRef, useState } from "react";

export function usePersistentState(key, initialValue) {
  const initialValueRef = useRef(initialValue);
  const storedValueRef = useRef(null);
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        storedValueRef.current = stored;
        return JSON.parse(stored);
      }
      storedValueRef.current = JSON.stringify(initialValue);
      return initialValue;
    } catch {
      storedValueRef.current = JSON.stringify(initialValue);
      return initialValue;
    }
  });

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
        setValue(nextValue);
      } catch {
        // Ignore malformed values written outside this application.
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, [key]);

  return [value, setValue];
}
