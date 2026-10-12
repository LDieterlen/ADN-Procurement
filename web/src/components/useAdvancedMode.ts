// « Mode avancé » (ADR-0012): a per-browser preference that reveals purchases, imports and the dashboard.
// Stored in localStorage (never in the database); unreadable storage simply means « off ».
import { useSyncExternalStore } from 'react'

const KEY = 'ffe.advanced'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setAdvancedMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: the preference lives for this render only
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function useAdvancedMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
