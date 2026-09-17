import { useEffect, useState } from 'react';
import { initRustCore, isRustReady } from '../wasm/engine';

/**
 * Custom hook that initializes the Rust WebAssembly module on mount
 * and returns its active readiness status.
 */
export function useRustCore(): boolean {
  const [isWasmActive, setIsWasmActive] = useState(false);

  useEffect(() => {
    initRustCore().then((ready) => {
      setIsWasmActive(ready && isRustReady());
    });
  }, []);

  return isWasmActive;
}
