/** Theme preference persisted in localStorage. */
export type ThemePreference = 'light' | 'dark' | 'auto'

export const THEME_STORAGE_KEY = 'maintainos-theme'

/** Local hours [start, end) treated as night → dark when preference is `auto`. */
export const AUTO_DARK_START_HOUR = 19
export const AUTO_DARK_END_HOUR = 7

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto'
}

/** Whether wall-clock hour should use dark in `auto` mode. */
export function isNightHour(
  hour: number,
  start = AUTO_DARK_START_HOUR,
  end = AUTO_DARK_END_HOUR,
): boolean {
  if (start === end) return false
  if (start > end) return hour >= start || hour < end
  return hour >= start && hour < end
}

export function resolveDark(
  preference: ThemePreference,
  hour = new Date().getHours(),
): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return isNightHour(hour)
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto'
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isValidThemePreference(raw) ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function writeStoredThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* private mode / quota */
  }
}

export function applyThemeClass(dark: boolean) {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0e1619' : '#eef4f6')
}

/** Inline boot script — keep in sync with resolveDark / storage key / hours. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=localStorage.getItem(k);if(m!=='light'&&m!=='dark'&&m!=='auto')m='auto';var h=(new Date()).getHours();var dark=m==='dark'||(m==='auto'&&(h>=${AUTO_DARK_START_HOUR}||h<${AUTO_DARK_END_HOUR}));var r=document.documentElement;r.classList.toggle('dark',dark);r.dataset.theme=dark?'dark':'light';r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`
