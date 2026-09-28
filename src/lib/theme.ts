/** Theme preference persisted in localStorage. */
export type ThemePreference = 'light' | 'dark' | 'auto'

export const THEME_STORAGE_KEY = 'maintainos-theme'

/** Israel wall-clock hours [start, end) treated as night → dark when `auto`. */
export const AUTO_DARK_START_HOUR = 19
export const AUTO_DARK_END_HOUR = 7
export const THEME_TIMEZONE = 'Asia/Jerusalem'

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto'
}

/** Hour 0–23 in Asia/Jerusalem (fallback to local if Intl fails). */
export function jerusalemHour(now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: THEME_TIMEZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now)
    const h = parts.find((p) => p.type === 'hour')?.value
    const n = h != null ? Number(h) : NaN
    if (Number.isFinite(n)) return n
  } catch {
    /* ignore */
  }
  return now.getHours()
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
  hour = jerusalemHour(),
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
  if (meta) meta.setAttribute('content', dark ? '#222220' : '#f7f6f2')
}

/** Inline boot script — keep in sync with resolveDark / storage key / hours / TZ. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=localStorage.getItem(k);if(m!=='light'&&m!=='dark'&&m!=='auto')m='auto';var h=new Date().getHours();try{var p=new Intl.DateTimeFormat('en-GB',{timeZone:${JSON.stringify(THEME_TIMEZONE)},hour:'numeric',hourCycle:'h23'}).formatToParts(new Date());var hv=p.find(function(x){return x.type==='hour'});if(hv)h=Number(hv.value)||h}catch(e){}var dark=m==='dark'||(m==='auto'&&(h>=${AUTO_DARK_START_HOUR}||h<${AUTO_DARK_END_HOUR}));var r=document.documentElement;r.classList.toggle('dark',dark);r.dataset.theme=dark?'dark':'light';r.style.colorScheme=dark?'dark':'light'}catch(e){}})();`
