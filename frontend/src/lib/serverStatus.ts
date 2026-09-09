import { useSyncExternalStore } from 'react';

let reachable: boolean | null = null;
const listeners = new Set<() => void>();

export function reportServerReachability(value: boolean | null): void {
  if (reachable === value) return;
  reachable = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useServerReachability(): boolean | null {
  return useSyncExternalStore(subscribe, () => reachable);
}
