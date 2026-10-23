import type { Selection } from './TransitionTable'
import type { Mode } from './theory'

export type Theme = 'light' | 'dark' | 'system'

export interface AppState {
  theme: Theme
  mode: Mode
  tonicPc: number
  selection: Selection | null
  sequence: number[]
  loop: boolean
}

export const DEFAULT_STATE: AppState = {
  theme: 'system',
  mode: 'major',
  tonicPc: 0,
  selection: null,
  sequence: [0, 4, 5, 3], // I - V - vi - IV по умолчанию
  loop: false,
}

const STORAGE_KEY = 'stages_app_state_v1'

export function loadAppState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
        ? parsed.theme
        : DEFAULT_STATE.theme,
      mode: parsed.mode === 'major' || parsed.mode === 'minor' ? parsed.mode : DEFAULT_STATE.mode,
      tonicPc:
        typeof parsed.tonicPc === 'number' && parsed.tonicPc >= 0 && parsed.tonicPc < 12
          ? parsed.tonicPc
          : DEFAULT_STATE.tonicPc,
      selection:
        parsed.selection &&
        typeof parsed.selection.from === 'number' &&
        typeof parsed.selection.to === 'number' &&
        parsed.selection.from >= 0 &&
        parsed.selection.from < 7 &&
        parsed.selection.to >= 0 &&
        parsed.selection.to < 7
          ? { from: parsed.selection.from, to: parsed.selection.to }
          : null,
      sequence:
        Array.isArray(parsed.sequence) &&
        parsed.sequence.every((n) => typeof n === 'number' && n >= 0 && n < 7)
          ? parsed.sequence.slice(0, 16)
          : DEFAULT_STATE.sequence,
      loop: Boolean(parsed.loop),
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage может быть переполнен или заблокирован в некоторых режимах инкогнито
  }
}
