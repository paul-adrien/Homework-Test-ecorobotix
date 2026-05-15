import { useEffect, useState } from "react";

/**
 * Returns `value` debounced by `ms` milliseconds — every change resets the
 * timer; the returned value updates only when the input has been stable for
 * the full delay. Useful for things like autocomplete inputs where we don't
 * want to hit the API on every keystroke.
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(handle);
  }, [value, ms]);

  return debounced;
}
